"""FastAPI application with sleep debt endpoints."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from starlette.staticfiles import StaticFiles as StarletteStaticFiles
from backend.models import SleepStatusResponse, SyncResponse, SleepData, SettingsRequest, SettingsResponse
from backend.config import API_HOST, API_PORT, CORS_ORIGINS, ENVIRONMENT
from db.database import (
    init_database, read_sleep_data, get_sleep_statistics,
    get_last_sync_time, set_last_sync_time, migrate_settings_from_env,
    get_user_settings, update_user_settings, recalculate_debt_for_all_records, get_connection,
    delete_all_sleep_data
)
from etl.garmin_sync import sync_sleep_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get project root directory (parent of backend/)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_HTML = FRONTEND_DIR / "index.html"
FRONTEND_V1_HTML = FRONTEND_DIR / "v1" / "index.html"
FRONTEND_V2_HTML = FRONTEND_DIR / "v2" / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    init_database()
    print("Database initialized")
    # Migrate settings from .env to database if they don't exist
    migrated = migrate_settings_from_env()
    if migrated:
        print("Settings migrated from .env to database")
    yield
    # Shutdown (if needed in future)
    pass


# Initialize FastAPI app
app = FastAPI(title="Sleep Debt Tracker", version="0.1.0", lifespan=lifespan)

# Enable CORS based on environment
# Note: Same-origin requests don't require CORS middleware - they work by default
# CORS is only needed for cross-origin requests
if CORS_ORIGINS is None:
    # Same-origin only: don't add CORS middleware
    # Same-origin requests will work without CORS
    # Cross-origin requests will be blocked (browser default behavior)
    pass  # No CORS middleware needed for same-origin only
elif len(CORS_ORIGINS) == 0:
    # Explicitly empty list: same as None - same-origin only, no CORS middleware
    pass  # No CORS middleware needed for same-origin only
else:
    # Specific origins configured: add CORS middleware with those origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Custom StaticFiles class that disables caching during development
class NoCacheStaticFiles(StarletteStaticFiles):
    """StaticFiles with no-cache headers for development."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    async def __call__(self, scope, receive, send):
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add no-cache headers
                headers = dict(message.get("headers", []))
                headers[b"cache-control"] = b"no-cache, no-store, must-revalidate"
                headers[b"pragma"] = b"no-cache"
                headers[b"expires"] = b"0"
                message["headers"] = list(headers.items())
            await send(message)
        
        await super().__call__(scope, receive, send_wrapper)

# Mount static files for frontend assets (after middleware, before routes)
# Serve static files from frontend root, v1, and v2
app.mount("/static", NoCacheStaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def root():
    """Root endpoint - redirect to v2 UI."""
    return RedirectResponse(url="/ui/v2")


@app.get("/ui/v1")
async def ui_v1():
    """Serve v1 legacy UI."""
    if not FRONTEND_V1_HTML.exists():
        raise HTTPException(status_code=404, detail="v1 UI not found")
    with open(FRONTEND_V1_HTML, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(
        content=content,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/ui/v2")
async def ui_v2():
    """Serve v2 new UI."""
    if not FRONTEND_V2_HTML.exists():
        raise HTTPException(status_code=404, detail="v2 UI not found")
    with open(FRONTEND_V2_HTML, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(
        content=content,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/api/sleep/status", response_model=SleepStatusResponse)
async def get_sleep_status():
    """Get current sleep status and statistics."""
    # Get current use_dummy_data setting to determine if we should include example data
    from backend.config import get_user_settings_from_db
    settings = get_user_settings_from_db()
    use_dummy_data = settings.get("use_dummy_data", False) if settings else False
    
    # Get statistics (include example data if use_dummy_data is True)
    stats = get_sleep_statistics(include_example=use_dummy_data)
    
    # Get recent data (uses STATS_WINDOW_DAYS as default, include example data if use_dummy_data is True)
    recent_data = read_sleep_data(include_example=use_dummy_data)
    
    # Get actual last sync time from database, or None if no sync has been performed
    last_sync = get_last_sync_time()
    
    # Get total real data days available
    from db.database import count_total_real_data_days
    total_real_data_days = count_total_real_data_days()
    
    from backend.config import STATS_WINDOW_DAYS
    
    return SleepStatusResponse(
        last_sync=last_sync,
        current_debt=stats["current_debt"],
        total_sleep_hours=stats["total_sleep_hours"],
        target_sleep_hours=stats["target_sleep_hours"],
        days_tracked=stats["days_tracked"],
        recent_data=[SleepData(**item) for item in recent_data],
        has_today_data=stats["has_today_data"],
        stats_window_days=STATS_WINDOW_DAYS(),
        total_real_data_days=total_real_data_days
    )


@app.post("/api/sleep/sync", response_model=SyncResponse)
async def sync_sleep():
    """Trigger sleep data synchronization from Garmin.
    
    Always syncs last 35 days to ensure comprehensive data coverage.
    """
    from backend.config import get_user_settings_from_db
    try:
        # Get use_dummy_data setting from database
        settings = get_user_settings_from_db()
        use_dummy_data = settings.get("use_dummy_data", False) if settings else False
        
        # Always sync 35 days to refresh historical data
        result = sync_sleep_data(days=35, use_dummy_data=use_dummy_data)
        
        # Save the actual sync timestamp to database
        if result.get("success") and "last_sync" in result:
            set_last_sync_time(result["last_sync"])
        
        # Ensure last_sync is present in response
        last_sync = result.get("last_sync", datetime.now().isoformat())
        
        return SyncResponse(
            success=result.get("success", False),
            message=result.get("message", f"Synced {result.get('records_synced', 0)} records"),
            records_synced=result.get("records_synced", 0),
            last_sync=last_sync,
            used_dummy_data=result.get("used_dummy_data", False)
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Sync error: {str(e)}", exc_info=True)
        return SyncResponse(
            success=False,
            message=f"Sync failed: {str(e)}",
            records_synced=0,
            last_sync=get_last_sync_time() or datetime.now().isoformat(),
            used_dummy_data=False
        )


@app.get("/api/settings", response_model=SettingsResponse)
async def get_settings():
    """Get current user settings."""
    from backend.config import get_user_settings_from_db, get_target_sleep_hours, get_stats_window_days
    
    try:
        settings = get_user_settings_from_db()
        updated_at = None
        if settings is not None:
            # Get updated_at from database and convert to string if needed
            with get_connection() as conn:
                result = conn.execute(
                    "SELECT updated_at FROM user_settings WHERE key = 'target_sleep_hours'"
                ).fetchone()
                if result and result[0]:
                    # Convert to string if it's not already
                    updated_at_value = result[0]
                    if isinstance(updated_at_value, str):
                        updated_at = updated_at_value
                    else:
                        # If it's a datetime or timestamp object, convert to ISO format
                        from datetime import datetime
                        if isinstance(updated_at_value, datetime):
                            updated_at = updated_at_value.isoformat()
                        else:
                            updated_at = str(updated_at_value)
        
        # Get use_dummy_data from settings (default to False)
        use_dummy_data = False
        if settings is not None:
            use_dummy_data = settings.get("use_dummy_data", False)
        
        return SettingsResponse(
            target_sleep_hours=get_target_sleep_hours(),
            stats_window_days=get_stats_window_days(),
            use_dummy_data=use_dummy_data,
            updated_at=updated_at
        )
    except Exception as e:
        logger.error(f"Error getting settings: {e}", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.put("/api/settings", response_model=SettingsResponse)
async def update_settings(settings: SettingsRequest):
    """Update user settings and recalculate debt if target hours changed."""
    from fastapi import HTTPException
    
    try:
        from backend.config import get_user_settings_from_db, get_target_sleep_hours
        
        # Validate input
        if settings.target_sleep_hours <= 0:
            raise HTTPException(status_code=400, detail="target_sleep_hours must be greater than 0")
        if settings.stats_window_days < 1:
            raise HTTPException(status_code=400, detail="stats_window_days must be at least 1")
        
        # Get current effective target hours (from DB or .env fallback) to check if target_hours changed
        current_target_hours = get_target_sleep_hours()
        
        # Get current settings to check if use_dummy_data or stats_window_days changed
        current_settings = get_user_settings_from_db()
        current_use_dummy_data = current_settings.get("use_dummy_data", False) if current_settings else False
        current_stats_window_days = current_settings.get("stats_window_days", 7) if current_settings else 7
        
        # Check if window changed
        window_changed = current_stats_window_days != settings.stats_window_days
        
        # Check if last sync was today
        from datetime import date, datetime
        last_sync_time = get_last_sync_time()
        last_sync_today = False
        if last_sync_time:
            try:
                # Parse ISO format timestamp
                if 'T' in last_sync_time:
                    last_sync_date = datetime.fromisoformat(last_sync_time.replace('Z', '+00:00')).date()
                else:
                    last_sync_date = datetime.strptime(last_sync_time, '%Y-%m-%d').date()
                last_sync_today = (last_sync_date == date.today())
            except Exception:
                # If parsing fails, assume not today to be safe
                last_sync_today = False
        
        # Verify data availability for the requested window
        # Note: count_available_days_in_window handles the case where today has no data
        # by excluding today and counting window_days days (yesterday + previous days)
        # Note: Example data is kept in the database with is_example=True flag
        # When use_dummy_data=True, include example data in queries. When False, exclude it.
        from db.database import count_available_days_in_window, count_example_data_in_window, get_sleep_statistics, count_total_real_data_days
        
        # Check data availability (include example data if use_dummy_data is True)
        available_days = count_available_days_in_window(settings.stats_window_days, include_example=settings.use_dummy_data)
        example_days = count_example_data_in_window(settings.stats_window_days)
        
        # Check if today has data to determine how many days to sync
        stats_for_sync = get_sleep_statistics(include_example=settings.use_dummy_data)
        today_has_data_for_sync = stats_for_sync.get("has_today_data", False)
        
        # Check total real data days available (not just in the window)
        total_real_days = count_total_real_data_days()
        # Required days is exactly the window size (if window is 7 days, we need 7 days of data)
        required_days_for_window = settings.stats_window_days
        
        logger.info(f"Data check: available_days={available_days}, total_real_days={total_real_days}, required_days={required_days_for_window}, use_dummy_data={settings.use_dummy_data}")
        
        # Only sync if there's insufficient data (not based on window change)
        # Window changes should not trigger automatic sync - user can manually sync if needed
        should_force_sync = False
        if available_days < required_days_for_window:
            # Check if we have real data available (even if not in the current window) before syncing
            # This is important when switching from dummy to real data
            if total_real_days >= required_days_for_window:
                logger.info(f"Insufficient data in window ({available_days} days), but {total_real_days} days of real data available (need {required_days_for_window}). No sync needed - data exists outside window.")
                should_force_sync = False  # Explicitly set to False
            else:
                # Insufficient data, need to sync
                should_force_sync = True
                logger.info(f"Insufficient data in window ({available_days} days) and insufficient real data ({total_real_days} days, need {required_days_for_window}). Need to sync for {settings.stats_window_days} days window...")
        elif window_changed:
            # Window changed - just log it, don't sync automatically
            logger.info(f"Window changed from {current_stats_window_days} to {settings.stats_window_days} days. Available data: {total_real_days} days. No automatic sync.")
        
        # Track if we've already synced to avoid duplicate syncs
        has_synced = False
        
        if should_force_sync and not settings.use_dummy_data:
            # Sync enough days to cover the window (add 1 extra day if today has no data)
            days_to_sync_force = settings.stats_window_days if today_has_data_for_sync else (settings.stats_window_days + 1)
            try:
                sync_result = sync_sleep_data(days=days_to_sync_force, use_dummy_data=False)
                if sync_result.get("success"):
                    logger.info(f"Force sync successful: {sync_result.get('records_synced', 0)} records synced")
                    # Re-check available days after sync
                    available_days = count_available_days_in_window(settings.stats_window_days, include_example=settings.use_dummy_data)
                    logger.info(f"After force sync: {available_days} days available for {settings.stats_window_days} days window")
                    has_synced = True
                else:
                    logger.warning(f"Force sync failed: {sync_result.get('message', 'Unknown error')}")
            except Exception as sync_error:
                logger.warning(f"Force sync failed: {sync_error}")
        
        # If use_dummy_data changed from True to False, check if we need to sync
        # Example data remains in DB with is_example=True but is excluded from queries
        # Only sync if we haven't already synced above and if we don't have enough real data
        if current_use_dummy_data and not settings.use_dummy_data and not has_synced:
            # Check if we have enough real data (example data is already excluded from count_available_days_in_window)
            # Use the already calculated total_real_days from above
            if total_real_days < required_days_for_window:
                logger.info(f"Switching from dummy to real data: only {total_real_days} days of real data available. Need {required_days_for_window} days. Syncing...")
                try:
                    # Sync enough days to cover the window (add 1 extra day if today has no data)
                    stats_for_sync_check = get_sleep_statistics(include_example=settings.use_dummy_data)
                    today_has_data_check = stats_for_sync_check.get("has_today_data", False)
                    days_to_sync = settings.stats_window_days if today_has_data_check else (settings.stats_window_days + 1)
                    sync_result = sync_sleep_data(days=days_to_sync, use_dummy_data=False)
                    if sync_result.get("success"):
                        available_days = count_available_days_in_window(settings.stats_window_days)
                        logger.info(f"Sync successful: {available_days} days available for {settings.stats_window_days} days window")
                        has_synced = True
                    else:
                        logger.warning(f"Sync failed: {sync_result.get('message', 'Unknown error')}")
                except Exception as sync_error:
                    logger.warning(f"Sync failed: {sync_error}")
            else:
                logger.info(f"Switching from dummy to real data: sufficient real data available ({total_real_days} days). No sync needed.")
        
        # If use_dummy_data is False and we have example data in the window, check if we need to sync
        # Example data remains in DB with is_example=True but is excluded from queries
        # (This handles the case where example_days > 0 but use_dummy_data wasn't just changed from True to False)
        if not settings.use_dummy_data:
            example_days_current = count_example_data_in_window(settings.stats_window_days)
            if example_days_current > 0 and not has_synced:
                logger.info(f"use_dummy_data is False but found {example_days_current} example data records in window. Example data will be excluded from queries.")
                # Re-check available days (include example data if use_dummy_data is True)
                available_days = count_available_days_in_window(settings.stats_window_days, include_example=settings.use_dummy_data)
                
                # Check if we have enough real data (example data is already excluded)
                # Use the already calculated total_real_days from above
                if total_real_days < required_days_for_window:
                    logger.info(f"Only {total_real_days} days of real data available. Need {required_days_for_window} days. Syncing...")
                    try:
                        # Sync enough days to cover the window (add 1 extra day if today has no data)
                        stats_for_sync_check = get_sleep_statistics()
                        today_has_data_check = stats_for_sync_check.get("has_today_data", False)
                        days_to_sync = settings.stats_window_days if today_has_data_check else (settings.stats_window_days + 1)
                        sync_result = sync_sleep_data(days=days_to_sync, use_dummy_data=False)
                        if sync_result.get("success"):
                            available_days = count_available_days_in_window(settings.stats_window_days, include_example=settings.use_dummy_data)
                            logger.info(f"Sync successful: {available_days} days available for {settings.stats_window_days} days window")
                            has_synced = True
                        else:
                            logger.warning(f"Sync failed: {sync_result.get('message', 'Unknown error')}")
                    except Exception as sync_error:
                        logger.warning(f"Sync failed: {sync_error}")
                else:
                    logger.info(f"Sufficient real data available ({total_real_days} days). No sync needed.")
        
        # If use_dummy_data is False and data is insufficient, try to sync or fallback to smaller window
        # The window always includes window_days days (excluding today if today has no data)
        # Only sync if we haven't already synced above
        # get_sleep_statistics is already imported above
        stats = get_sleep_statistics(include_example=settings.use_dummy_data)
        today_has_data = stats.get("has_today_data", False)
        
        # Only sync if data is insufficient AND we haven't already synced above
        if not settings.use_dummy_data and available_days < settings.stats_window_days and not has_synced:
            # Try automatic sync with Garmin
            # If today has no data, sync one extra day to get the full window_days
            days_to_sync = settings.stats_window_days if today_has_data else (settings.stats_window_days + 1)
            logger.info(f"Data insufficient for {settings.stats_window_days} days window ({available_days} days available). Attempting sync for {days_to_sync} days...")
            try:
                sync_result = sync_sleep_data(days=days_to_sync, use_dummy_data=False)
                if sync_result.get("success"):
                    # Re-check after sync
                    available_days = count_available_days_in_window(settings.stats_window_days)
                    logger.info(f"After sync: {available_days} days available for {settings.stats_window_days} days window")
            except Exception as sync_error:
                logger.warning(f"Automatic sync failed: {sync_error}")
            
            # If still insufficient, try fallback to smaller windows
            if available_days < settings.stats_window_days:
                fallback_windows = [14, 7] if settings.stats_window_days == 30 else ([7] if settings.stats_window_days == 14 else [])
                
                for fallback_window in fallback_windows:
                    # Try to sync one extra day if today has no data
                    fallback_days_to_sync = fallback_window if today_has_data else (fallback_window + 1)
                    logger.info(f"Trying to sync {fallback_days_to_sync} days for fallback window of {fallback_window} days...")
                    try:
                        fallback_sync_result = sync_sleep_data(days=fallback_days_to_sync, use_dummy_data=False)
                        if fallback_sync_result.get("success"):
                            fallback_available = count_available_days_in_window(fallback_window, include_example=settings.use_dummy_data)
                            if fallback_available >= fallback_window:
                                logger.warning(f"Insufficient data for {settings.stats_window_days} days. Falling back to {fallback_window} days window.")
                                settings.stats_window_days = fallback_window
                                available_days = fallback_available
                                break
                    except Exception as fallback_sync_error:
                        logger.warning(f"Fallback sync failed: {fallback_sync_error}")
                        # Check if we have enough data anyway
                        fallback_available = count_available_days_in_window(fallback_window)
                        if fallback_available >= fallback_window:
                            logger.warning(f"Insufficient data for {settings.stats_window_days} days. Falling back to {fallback_window} days window.")
                            settings.stats_window_days = fallback_window
                            available_days = fallback_available
                            break
                
                # If even 7 days are not available, return error
                if available_days < 7:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient data: only {available_days} days available, but at least 7 days are required. Please sync data or enable 'use dummy data' in settings."
                    )
        
        # If use_dummy_data is True, generate dummy data if needed
        # Example data remains in DB with is_example=True and will be included in queries
        if settings.use_dummy_data:
            # Generate dummy data for the requested window (at least 3 days, or window size)
            days_to_generate = max(3, settings.stats_window_days)
            logger.info(f"use_dummy_data is True. Generating {days_to_generate} days of example data...")
            try:
                sync_result = sync_sleep_data(days=days_to_generate, use_dummy_data=True)
                if not sync_result.get("success"):
                    logger.warning(f"Failed to generate dummy data: {sync_result.get('message')}")
            except Exception as dummy_error:
                logger.error(f"Error generating dummy data: {dummy_error}")
        
        # Update settings in database
        update_user_settings(settings.target_sleep_hours, settings.stats_window_days, settings.use_dummy_data)
        
        # Recalculate debt if target_hours changed (with tolerance for floating point)
        if abs(current_target_hours - settings.target_sleep_hours) > 0.001:
            try:
                records_updated = recalculate_debt_for_all_records(settings.target_sleep_hours)
                logger.info(f"Recalculated debt for {records_updated} records with new target: {settings.target_sleep_hours}")
            except Exception as recalc_error:
                logger.error(f"Error recalculating debt: {recalc_error}", exc_info=True)
                # Don't fail the whole request if recalculation fails
        
        # Get updated_at from database and convert to string if needed
        updated_at = None
        try:
            with get_connection() as conn:
                result = conn.execute(
                    "SELECT updated_at FROM user_settings WHERE key = 'target_sleep_hours'"
                ).fetchone()
                if result and result[0]:
                    # Convert to string if it's not already
                    updated_at_value = result[0]
                    if isinstance(updated_at_value, str):
                        updated_at = updated_at_value
                    else:
                        # If it's a datetime or timestamp object, convert to ISO format
                        from datetime import datetime
                        if isinstance(updated_at_value, datetime):
                            updated_at = updated_at_value.isoformat()
                        else:
                            updated_at = str(updated_at_value)
        except Exception as timestamp_error:
            logger.error(f"Error getting updated_at: {timestamp_error}", exc_info=True)
            # Don't fail if we can't get timestamp, just leave it None
        return SettingsResponse(
            target_sleep_hours=settings.target_sleep_hours,
            stats_window_days=settings.stats_window_days,
            use_dummy_data=settings.use_dummy_data,
            updated_at=updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.delete("/api/sleep/data")
async def delete_all_data():
    """Delete all sleep data from the database (for testing/first access simulation).
    
    WARNING: This permanently deletes all sleep data. Use with caution.
    """
    try:
        deleted_count = delete_all_sleep_data()
        logger.warning(f"All sleep data deleted: {deleted_count} records removed")
        return {
            "success": True,
            "message": f"Deleted {deleted_count} sleep data records",
            "records_deleted": deleted_count
        }
    except Exception as e:
        logger.error(f"Error deleting all sleep data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)

