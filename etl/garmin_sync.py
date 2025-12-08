"""Garmin data synchronization."""
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional
import logging
from pathlib import Path

import garth
from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectTooManyRequestsError

from backend.config import GARMIN_EMAIL, GARMIN_PASSWORD
from etl.sleep_debt import calculate_sleep_debt, calculate_daily_debt
from db.database import write_sleep_batch

logger = logging.getLogger(__name__)

# Directory for storing Garmin session tokens
TOKENS_DIR = Path.home() / ".garminconnect" / "tokens"
TOKENS_DIR.mkdir(parents=True, exist_ok=True)


def _generate_dummy_sleep_data(days: int) -> List[Dict]:
    """Generate dummy sleep data for a given number of days with variation."""
    import random
    dummy_data: List[Dict] = []
    today = datetime.now()

    # Import target from config
    from backend.config import TARGET_SLEEP_HOURS
    target_hours = TARGET_SLEEP_HOURS()
    
    # Base sleep hours around target, with variation
    base_sleep = target_hours

    for i in range(days):
        date = today - timedelta(days=i)
        # Generate varied sleep data: base ± 1.5 hours with some randomness
        # This creates realistic variation (e.g., 6.5h to 9.5h if target is 8h)
        variation = (i % 5 - 2) * 0.5  # Cycles: -1.0, -0.5, 0.0, 0.5, 1.0
        random_offset = random.uniform(-0.3, 0.3)  # Small random variation
        sleep_hours = round(base_sleep + variation + random_offset, 1)
        # Clamp to reasonable range (5h to 11h)
        sleep_hours = max(5.0, min(11.0, sleep_hours))
        
        debt = calculate_daily_debt(sleep_hours, target_hours)

        dummy_data.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "sleep_hours": sleep_hours,
                "target_hours": target_hours,
                "debt": debt,
                "is_example": True,  # Mark as example data
            }
        )

    return dummy_data


def _fetch_garmin_sleep_data(days: int) -> List[Dict]:
    """Fetch real sleep data from Garmin Connect.
    
    Uses garth library directly for more reliable authentication.
    
    Args:
        days: Number of days to fetch
        
    Returns:
        List of sleep data records
        
    Raises:
        ValueError: If credentials are missing or authentication fails
    """
    # Check credentials
    if not GARMIN_EMAIL or not GARMIN_PASSWORD:
        raise ValueError(
            "Garmin credentials not configured. "
            "Please set GARMIN_EMAIL and GARMIN_PASSWORD in .env file"
        )
    
    logger.info(f"Authenticating with Garmin Connect as {GARMIN_EMAIL}")
    
    # Configure garth to use token directory for session persistence
    garth.configure(domain="garmin.com")
    
    # Try to resume existing session first (if tokens exist)
    client = None
    try:
        if TOKENS_DIR.exists() and any(TOKENS_DIR.glob("*.json")):
            garth.resume(TOKENS_DIR)
            logger.info("Attempting to resume existing Garmin Connect session")
            # Create client without credentials - will use saved session
            client = Garmin()
            # Verify session is still valid
            try:
                client.get_user_profile()
                logger.info("Existing session is valid")
            except Exception:
                logger.info("Existing session expired, will re-authenticate")
                client = None
    except (FileNotFoundError, Exception) as e:
        logger.debug(f"Could not resume session: {e}")
        client = None
    
    # If no valid session, perform fresh login
    if client is None:
        logger.info("No valid session found, performing fresh login...")
        try:
            # Create client with credentials - garminconnect will handle garth internally
            client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
            client.login()
            
            # Save tokens for future use
            try:
                garth.save(TOKENS_DIR)
                logger.info("Successfully authenticated and saved session tokens")
            except Exception as e:
                logger.warning(f"Could not save tokens (will retry login next time): {e}")
                
        except GarminConnectConnectionError as e:
            error_msg = str(e)
            logger.error(f"Garmin authentication failed: {error_msg}")
            
            # Check if it's a 401 error (unauthorized)
            if "401" in error_msg or "Unauthorized" in error_msg:
                raise ValueError(
                    "Garmin authentication failed: Invalid credentials or authentication issue.\n\n"
                    "Possible causes:\n"
                    "1. Credentials are incorrect - verify email and password in .env file\n"
                    "2. VPN or network restrictions - try disabling VPN or using different network\n"
                    "3. Rate limiting - wait a few hours if you've made many login attempts\n"
                    "4. Network/firewall blocking Garmin servers\n\n"
                    "Troubleshooting steps:\n"
                    "- Verify credentials work on garmin.com website\n"
                    "- Try from a different network (mobile hotspot)\n"
                    "- Wait 2-24 hours if rate limited\n"
                    "- Check if VPN/firewall is interfering\n"
                    "- Try running from a different location/network"
                )
            raise ValueError(f"Garmin authentication failed: {error_msg}")
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected error during Garmin authentication: {error_msg}")
            
            # Check for common error patterns
            if "401" in error_msg or "Unauthorized" in error_msg:
                raise ValueError(
                    "Garmin authentication failed: Invalid credentials or authentication issue. "
                    "Please verify your email and password in .env file and try from a different network."
                )
            raise ValueError(f"Failed to connect to Garmin Connect: {error_msg}")
    
    # Fetch sleep data for the specified period
    sleep_data: List[Dict] = []
    today = date.today()
    # Import target from config
    from backend.config import TARGET_SLEEP_HOURS
    target_hours = TARGET_SLEEP_HOURS()
    
    logger.info(f"Fetching sleep data for last {days} days...")
    
    for i in range(days):
        sleep_date = today - timedelta(days=i)
        
        try:
            # Fetch sleep data for the specific date
            garmin_sleep = client.get_sleep_data(sleep_date.isoformat())
            
            # Log raw data structure for debugging
            if i == 0:  # Only log for first day to avoid spam
                logger.info(f"Sample Garmin sleep data for {sleep_date}: type={type(garmin_sleep)}, keys={list(garmin_sleep.keys())[:15] if isinstance(garmin_sleep, dict) else 'Not a dict'}")
                # Log timestamp fields if present
                if isinstance(garmin_sleep, dict):
                    if 'sleepStartTimestampGMT' in garmin_sleep:
                        logger.info(f"  sleepStartTimestampGMT: {garmin_sleep['sleepStartTimestampGMT']}")
                    if 'sleepEndTimestampGMT' in garmin_sleep:
                        logger.info(f"  sleepEndTimestampGMT: {garmin_sleep['sleepEndTimestampGMT']}")
            
            # Parse Garmin sleep data format
            sleep_hours = _parse_garmin_sleep_duration(garmin_sleep)
            
            # Log parsing result for debugging
            if sleep_hours is None:
                logger.warning(f"Parser returned None for {sleep_date}. Available keys: {list(garmin_sleep.keys())[:15] if isinstance(garmin_sleep, dict) else 'Not a dict'}")
            else:
                logger.info(f"Parser succeeded for {sleep_date}: {sleep_hours:.2f}h")
            
            if sleep_hours is not None and sleep_hours > 0:
                debt = calculate_daily_debt(sleep_hours, target_hours)
                
                sleep_data.append({
                    "date": sleep_date.strftime("%Y-%m-%d"),
                    "sleep_hours": sleep_hours,
                    "target_hours": target_hours,
                    "debt": debt,
                })
                logger.info(f"✓ Fetched sleep data for {sleep_date}: {sleep_hours:.1f}h")
            else:
                # Only log warning if we expected data (not weekends or very old dates)
                if i < 7:  # Only warn for recent dates
                    logger.debug(f"No valid sleep data for {sleep_date} (data may not exist for this date)")
                
        except GarminConnectTooManyRequestsError:
            logger.warning(f"Rate limit reached, stopping fetch at day {i}")
            break
        except Exception as e:
            logger.error(f"Error fetching sleep data for {sleep_date}: {e}", exc_info=True)
            # Continue with next day instead of failing completely
            continue
    
    if len(sleep_data) == 0:
        logger.warning(f"No sleep data retrieved from Garmin for the last {days} days. This might indicate:")
        logger.warning("  - No sleep data available for the requested period")
        logger.warning("  - Parser is not extracting data correctly")
        logger.warning("  - Authentication issues (though login appeared successful)")
    else:
        logger.info(f"Successfully fetched {len(sleep_data)} sleep records from Garmin")
    return sleep_data


def _parse_garmin_sleep_duration(garmin_sleep: Dict) -> Optional[float]:
    """Parse sleep duration from Garmin sleep data format.
    
    Garmin returns sleep data in various formats. This function extracts
    the total sleep duration in hours.
    
    Args:
        garmin_sleep: Raw sleep data from Garmin API
        
    Returns:
        Sleep duration in hours, or None if not available
    """
    if not garmin_sleep:
        return None
    
    # Handle case where data might be a list (take first item)
    if isinstance(garmin_sleep, list):
        if len(garmin_sleep) > 0:
            garmin_sleep = garmin_sleep[0]
        else:
            return None
    
    # Try different possible fields for sleep duration
    # Garmin API format can vary, so we check multiple possibilities
    sleep_seconds = None
    
    # Check for 'sleepTimeSeconds' or similar fields (most common)
    if 'sleepTimeSeconds' in garmin_sleep:
        sleep_seconds = garmin_sleep['sleepTimeSeconds']
    elif 'totalSleepTimeSeconds' in garmin_sleep:
        sleep_seconds = garmin_sleep['totalSleepTimeSeconds']
    elif 'sleepTime' in garmin_sleep:
        sleep_seconds = garmin_sleep['sleepTime']
    elif 'duration' in garmin_sleep:
        sleep_seconds = garmin_sleep['duration']
    elif 'totalSleepSeconds' in garmin_sleep:
        sleep_seconds = garmin_sleep['totalSleepSeconds']
    # Check nested structures
    elif 'sleepSummary' in garmin_sleep:
        summary = garmin_sleep['sleepSummary']
        if isinstance(summary, dict):
            if 'sleepTimeSeconds' in summary:
                sleep_seconds = summary['sleepTimeSeconds']
            elif 'totalSleepTimeSeconds' in summary:
                sleep_seconds = summary['totalSleepTimeSeconds']
    # Check for 'sleepMovement' or 'sleepLevels' which might contain duration
    elif 'sleepMovement' in garmin_sleep:
        movement = garmin_sleep['sleepMovement']
        if isinstance(movement, dict) and 'sleepTimeSeconds' in movement:
            sleep_seconds = movement['sleepTimeSeconds']
    # Check wellnessSleepData array - sum of all sleep periods
    elif 'wellnessSleepData' in garmin_sleep:
        wellness_data = garmin_sleep['wellnessSleepData']
        if isinstance(wellness_data, list) and len(wellness_data) > 0:
            # Calculate total sleep from wellness data intervals
            total_ms = 0
            for entry in wellness_data:
                if isinstance(entry, dict) and 'startGMT' in entry and 'endGMT' in entry:
                    try:
                        start = entry['startGMT']
                        end = entry['endGMT']
                        if isinstance(start, (int, float)) and isinstance(end, (int, float)):
                            # Convert to seconds if in milliseconds
                            if start > 1e10:
                                start = start / 1000.0
                            if end > 1e10:
                                end = end / 1000.0
                            total_ms += (end - start)
                    except (ValueError, TypeError):
                        continue
            if total_ms > 0:
                sleep_seconds = total_ms
                logger.debug(f"Calculated sleep duration from wellnessSleepData: {sleep_seconds/3600:.2f}h")
    
    if sleep_seconds is not None:
        # Convert seconds to hours
        try:
            hours = float(sleep_seconds) / 3600.0
            # Sanity check: sleep should be between 0 and 24 hours
            if 0 <= hours <= 24:
                return hours
            else:
                logger.warning(f"Parsed sleep duration {hours:.1f}h is outside valid range (0-24h)")
                return None
        except (ValueError, TypeError):
            logger.warning(f"Could not convert sleep_seconds to float: {sleep_seconds}")
            return None
    
    # If no direct duration found, try calculating from start/end times
    start_time = None
    end_time = None
    
    # Try various timestamp field names (check GMT versions first as they're more reliable)
    # Also check nested structures like dailySleepDTO
    for start_field in ['sleepStartTimestampGMT', 'sleepStartTimestamp', 'startTimeGMT', 'startTime']:
        if start_field in garmin_sleep:
            start_time = garmin_sleep[start_field]
            break
    
    for end_field in ['sleepEndTimestampGMT', 'sleepEndTimestamp', 'endTimeGMT', 'endTime']:
        if end_field in garmin_sleep:
            end_time = garmin_sleep[end_field]
            break
    
    # Check inside dailySleepDTO if timestamps not found at top level
    if (start_time is None or end_time is None) and 'dailySleepDTO' in garmin_sleep:
        daily_sleep = garmin_sleep['dailySleepDTO']
        if isinstance(daily_sleep, dict):
            if start_time is None:
                for start_field in ['sleepStartTimestampGMT', 'sleepStartTimestamp', 'startTimeGMT', 'startTime']:
                    if start_field in daily_sleep:
                        start_time = daily_sleep[start_field]
                        break
            if end_time is None:
                for end_field in ['sleepEndTimestampGMT', 'sleepEndTimestamp', 'endTimeGMT', 'endTime']:
                    if end_field in daily_sleep:
                        end_time = daily_sleep[end_field]
                        break
    
    if start_time is not None and end_time is not None:
        try:
            # Handle different timestamp formats
            # Garmin timestamps are typically in milliseconds (13 digits)
            if isinstance(start_time, (int, float)):
                # Convert milliseconds to seconds if timestamp > 1e10 (year 2001+ in ms)
                if start_time > 1e10:
                    start_ts = start_time / 1000.0
                else:
                    start_ts = float(start_time)
                start = datetime.fromtimestamp(start_ts, tz=None)
            else:
                start_str = str(start_time).replace('Z', '+00:00')
                start = datetime.fromisoformat(start_str)
            
            if isinstance(end_time, (int, float)):
                # Convert milliseconds to seconds if timestamp > 1e10
                if end_time > 1e10:
                    end_ts = end_time / 1000.0
                else:
                    end_ts = float(end_time)
                end = datetime.fromtimestamp(end_ts, tz=None)
            else:
                end_str = str(end_time).replace('Z', '+00:00')
                end = datetime.fromisoformat(end_str)
            
            duration = (end - start).total_seconds()
            hours = duration / 3600.0
            
            # Log for debugging
            logger.info(f"Calculated sleep duration from timestamps: start={start_time}, end={end_time}, duration={hours:.2f}h")
            
            # Sanity check: sleep should be between 0 and 24 hours
            if 0 <= hours <= 24:
                return hours
            else:
                logger.warning(f"Calculated sleep duration {hours:.1f}h from timestamps is outside valid range (0-24h)")
                return None
        except (ValueError, TypeError, KeyError, OSError) as e:
            logger.warning(f"Could not calculate duration from timestamps: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            pass
    
    # If we still haven't found anything, log the structure for debugging (only once)
    if not hasattr(_parse_garmin_sleep_duration, '_logged_missing'):
        logger.debug(f"Could not parse sleep duration. Available keys: {list(garmin_sleep.keys()) if isinstance(garmin_sleep, dict) else 'Not a dict'}")
        _parse_garmin_sleep_duration._logged_missing = True
    
    return None


def sync_sleep_data(days: int = None, use_dummy_data: bool = False) -> Dict:
    """Sync sleep data from Garmin Connect and persist it to DuckDB.
    
    This function attempts to fetch real data from Garmin Connect.
    If use_dummy_data is True, generates dummy data instead.
    If use_dummy_data is False and sync fails, returns error instead of falling back to dummy data.
    
    Args:
        days: Number of days to sync (defaults to STATS_WINDOW_DAYS from config)
        use_dummy_data: If True, generate dummy data instead of syncing from Garmin (default: False)
        
    Returns:
        Dictionary with sync results
    """
    from backend.config import STATS_WINDOW_DAYS
    if days is None:
        days = STATS_WINDOW_DAYS()
    logger.info(f"Starting sleep data sync for last {days} days...")
    
    # If use_dummy_data is True, generate dummy data directly
    if use_dummy_data:
        logger.info("use_dummy_data is True, generating dummy data instead of syncing from Garmin")
        sleep_data = _generate_dummy_sleep_data(days)
        
        if not sleep_data:
            return {
                "success": False,
                "message": f"Failed to generate dummy data",
                "records_synced": 0,
                "last_sync": datetime.now().isoformat(),
                "total_debt": 0.0,
                "used_dummy_data": True,
            }
        
        # Calculate total debt on dummy dataset
        total_debt = calculate_sleep_debt(sleep_data)
        
        # Persist dummy data to DuckDB, but preserve existing real data
        # This ensures real data is not overwritten when generating dummy data
        records_written = write_sleep_batch(sleep_data, preserve_real_data=True)
        
        logger.info(f"Dummy data sync complete: {records_written} dummy records written to DuckDB (real data preserved)")
        
        message = f"Generated {records_written} dummy records ({days} days window)"
        
        return {
            "success": True,
            "message": message,
            "records_synced": records_written,
            "last_sync": datetime.now().isoformat(),
            "total_debt": total_debt,
            "used_dummy_data": True,
        }
    
    try:
        # Fetch real data from Garmin
        sleep_data = _fetch_garmin_sleep_data(days)
        
        # If we got some data (even if not all days), use it
        # Empty list is acceptable if authentication succeeded but no data available
        if sleep_data:
            # Calculate total debt on the dataset
            total_debt = calculate_sleep_debt(sleep_data)
            
            # Persist to DuckDB
            records_written = write_sleep_batch(sleep_data)
            
            logger.info(f"Sync complete: {records_written} records written to DuckDB")
            
            # Build message indicating requested window vs actual records
            if records_written < days:
                message = f"Synced {records_written} records from Garmin Connect (requested {days} days window - some days may not have data yet)"
            else:
                message = f"Synced {records_written} records from Garmin Connect ({days} days window)"
            
            return {
                "success": True,
                "message": message,
                "records_synced": records_written,
                "last_sync": datetime.now().isoformat(),
                "total_debt": total_debt,
                "used_dummy_data": False,
            }
        else:
            # Authentication succeeded but no sleep data found for requested period
            # This is different from authentication failure - use fallback
            logger.warning("Garmin authentication succeeded but no sleep data found for requested period. Using fallback data.")
            raise ValueError("No sleep data retrieved from Garmin Connect for the requested period")
        
    except ValueError as e:
        # Credentials missing or authentication failed
        # Since use_dummy_data is False, return error instead of falling back
        logger.error(f"Garmin sync failed: {e}. use_dummy_data is False, returning error.")
        return {
            "success": False,
            "message": f"Garmin sync failed: {str(e)}. Enable 'use dummy data' in settings to use generated data instead.",
            "records_synced": 0,
            "last_sync": datetime.now().isoformat(),
            "total_debt": 0.0,
            "used_dummy_data": False,
        }
        
    except Exception as e:
        # Other unexpected errors
        # Since use_dummy_data is False, return error instead of falling back
        logger.error(f"Unexpected error during Garmin sync: {e}. use_dummy_data is False, returning error.")
        return {
            "success": False,
            "message": f"Unexpected error during Garmin sync: {str(e)}. Enable 'use dummy data' in settings to use generated data instead.",
            "records_synced": 0,
            "last_sync": datetime.now().isoformat(),
            "total_debt": 0.0,
            "used_dummy_data": False,
        }

