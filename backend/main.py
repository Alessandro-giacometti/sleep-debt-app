"""FastAPI application with sleep debt endpoints."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from starlette.staticfiles import StaticFiles as StarletteStaticFiles
from backend.models import SleepStatusResponse, SyncResponse, SleepData
from backend.config import API_HOST, API_PORT, CORS_ORIGINS, ENVIRONMENT
from db.database import (
    init_database, read_sleep_data, get_sleep_statistics,
    get_last_sync_time, set_last_sync_time
)
from etl.garmin_sync import sync_sleep_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Get project root directory (parent of backend/)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_HTML = FRONTEND_DIR / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    init_database()
    print("Database initialized")
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
app.mount("/static", NoCacheStaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def root():
    """Root endpoint - serve frontend HTML."""
    with open(FRONTEND_HTML, "r", encoding="utf-8") as f:
        content = f.read()
    # Add no-cache headers to prevent browser caching during development
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
    # Get statistics (excludes today if no data available)
    stats = get_sleep_statistics()
    
    # Get recent data (uses STATS_WINDOW_DAYS as default)
    recent_data = read_sleep_data()
    
    # Get actual last sync time from database, or None if no sync has been performed
    last_sync = get_last_sync_time()
    
    from backend.config import STATS_WINDOW_DAYS
    
    return SleepStatusResponse(
        last_sync=last_sync,
        current_debt=stats["current_debt"],
        total_sleep_hours=stats["total_sleep_hours"],
        target_sleep_hours=stats["target_sleep_hours"],
        days_tracked=stats["days_tracked"],
        recent_data=[SleepData(**item) for item in recent_data],
        has_today_data=stats["has_today_data"],
        stats_window_days=STATS_WINDOW_DAYS
    )


@app.post("/api/sleep/sync", response_model=SyncResponse)
async def sync_sleep():
    """Trigger sleep data synchronization from Garmin."""
    from backend.config import STATS_WINDOW_DAYS
    try:
        result = sync_sleep_data(days=STATS_WINDOW_DAYS)
        
        # Save the actual sync timestamp to database
        if result.get("success") and "last_sync" in result:
            set_last_sync_time(result["last_sync"])
        
        # Ensure last_sync is present in response
        last_sync = result.get("last_sync", datetime.now().isoformat())
        
        return SyncResponse(
            success=result.get("success", False),
            message=result.get("message", f"Synced {result.get('records_synced', 0)} records"),
            records_synced=result.get("records_synced", 0),
            last_sync=last_sync
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Sync error: {str(e)}", exc_info=True)
        return SyncResponse(
            success=False,
            message=f"Sync failed: {str(e)}",
            records_synced=0,
            last_sync=get_last_sync_time() or datetime.now().isoformat()
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)

