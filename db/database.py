"""DuckDB database initialization and operations."""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Any

import duckdb
from pathlib import Path
from backend.config import DB_PATH


@dataclass
class SleepRecord:
    """Typed representation of one sleep record stored in DuckDB."""

    date: str          # ISO date (YYYY-MM-DD)
    sleep_hours: float
    target_hours: float
    debt: float
    is_example: bool = False  # True if this is example/dummy data


@contextmanager
def get_connection():
    """Yield a DuckDB connection and ensure it is closed."""
    # Ensure database directory exists
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()


def init_database() -> bool:
    """Initialize DuckDB database and create tables if they do not exist."""
    with get_connection() as conn:
        # Main table for real sleep data (no is_example column needed)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sleep_data (
                date DATE PRIMARY KEY,
                sleep_hours REAL,
                target_hours REAL,
                debt REAL
            )
            """
        )
        # Separate table for example/dummy sleep data
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS example_sleep_data (
                date DATE PRIMARY KEY,
                sleep_hours REAL,
                target_hours REAL,
                debt REAL
            )
            """
        )
        # Create metadata table for tracking last sync time
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP
            )
            """
        )
        # Create user settings table for configurable parameters
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP
            )
            """
        )
    return True


def write_sleep_data(date: str, sleep_hours: float, target_hours: float, debt: float, is_example: bool = False) -> bool:
    """Insert or update a single day's sleep data in DuckDB.
    
    Real data goes to sleep_data table, example data goes to example_sleep_data table.
    """
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        if is_example:
            # Write to example_sleep_data table
            conn.execute(
                """
                INSERT INTO example_sleep_data (date, sleep_hours, target_hours, debt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (date) DO UPDATE SET
                    sleep_hours = excluded.sleep_hours,
                    target_hours = excluded.target_hours,
                    debt = excluded.debt
                """,
                [date, sleep_hours, target_hours, debt],
            )
        else:
            # Write to sleep_data table
            conn.execute(
                """
                INSERT INTO sleep_data (date, sleep_hours, target_hours, debt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (date) DO UPDATE SET
                    sleep_hours = excluded.sleep_hours,
                    target_hours = excluded.target_hours,
                    debt = excluded.debt
                """,
                [date, sleep_hours, target_hours, debt],
            )

    return True


def write_sleep_batch(records: Iterable[Dict], preserve_real_data: bool = False) -> int:
    """Insert or update a batch of sleep records.
    
    Real data goes to sleep_data table, example data goes to example_sleep_data table.

    Args:
        records: iterable of dicts with keys: date, sleep_hours, target_hours, debt, is_example
        preserve_real_data: If True, don't overwrite real data when writing example data (ignored, always preserved)

    Returns:
        Number of records written.
    """
    records_list: List[SleepRecord] = [
        SleepRecord(
            date=r["date"],
            sleep_hours=float(r["sleep_hours"]),
            target_hours=float(r["target_hours"]),
            debt=float(r["debt"]),
            is_example=r.get("is_example", False),
        )
        for r in records
    ]

    if not records_list:
        return 0

    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        # Separate real data and example data
        real_data = [r for r in records_list if not r.is_example]
        example_data = [r for r in records_list if r.is_example]
        
        # Write real data to sleep_data table
        if real_data:
            conn.executemany(
                """
                INSERT INTO sleep_data (date, sleep_hours, target_hours, debt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (date) DO UPDATE SET
                    sleep_hours = excluded.sleep_hours,
                    target_hours = excluded.target_hours,
                    debt = excluded.debt
                """,
                [
                    (r.date, r.sleep_hours, r.target_hours, r.debt)
                    for r in real_data
                ],
            )
        
        # Write example data to example_sleep_data table (separate table)
        if example_data:
            conn.executemany(
                """
                INSERT INTO example_sleep_data (date, sleep_hours, target_hours, debt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (date) DO UPDATE SET
                    sleep_hours = excluded.sleep_hours,
                    target_hours = excluded.target_hours,
                    debt = excluded.debt
                """,
                [
                    (r.date, r.sleep_hours, r.target_hours, r.debt)
                    for r in example_data
                ],
            )

    return len(records_list)


def read_sleep_data(limit: int = None, include_example: bool = False) -> List[Dict]:
    """Read recent sleep data from database ordered by date descending.
    
    Uses the same window logic as get_sleep_statistics:
    - If today has data: includes today and the previous (limit - 1) days
    - If today has no data: includes the previous limit days (excluding today)
    
    Args:
        limit: Number of days to retrieve (defaults to STATS_WINDOW_DAYS from config)
        include_example: If True, include example data from example_sleep_data table
    """
    from datetime import date, timedelta
    from backend.config import STATS_WINDOW_DAYS
    
    if limit is None:
        limit = STATS_WINDOW_DAYS()
    
    today = date.today()
    today_str = today.isoformat()
    
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        # Check if today's data exists (using same logic as get_sleep_statistics)
        if include_example:
            # Only check example data table (when use_dummy_data=True, ignore real data completely)
            today_exists = conn.execute(
                "SELECT COUNT(*) FROM example_sleep_data WHERE date = ?",
                [today_str]
            ).fetchone()[0] > 0
        else:
            # Only check real data table (when use_dummy_data=False, ignore example data completely)
            today_exists = conn.execute(
                "SELECT COUNT(*) FROM sleep_data WHERE date = ?",
                [today_str]
            ).fetchone()[0] > 0
        
        # Calculate window boundaries (same logic as get_sleep_statistics)
        if today_exists:
            # Include today: go back (limit - 1) days
            window_start = today - timedelta(days=limit - 1)
            window_end = today
        else:
            # Exclude today: go back limit days
            window_start = today - timedelta(days=limit)
            window_end = today - timedelta(days=1)  # Yesterday
        
        window_start_str = window_start.isoformat()
        window_end_str = window_end.isoformat()
        
        if include_example:
            # Only example data (when use_dummy_data=True, ignore real data completely)
            result = conn.execute(
                """
                SELECT
                    strftime('%Y-%m-%d', date) AS date,
                    sleep_hours,
                    target_hours,
                    debt,
                    TRUE AS is_example
                FROM example_sleep_data
                WHERE date >= ? AND date <= ?
                ORDER BY date DESC
                """,
                [window_start_str, window_end_str],
            ).fetchall()
        else:
            # Only real data (when use_dummy_data=False, ignore example data completely)
            result = conn.execute(
                """
                SELECT
                    strftime('%Y-%m-%d', date) AS date,
                    sleep_hours,
                    target_hours,
                    debt,
                    FALSE AS is_example
                FROM sleep_data
                WHERE date >= ? AND date <= ?
                ORDER BY date DESC
                """,
                [window_start_str, window_end_str],
            ).fetchall()

    return [
        {
            "date": row[0],
            "sleep_hours": float(row[1]),
            "target_hours": float(row[2]),
            "debt": float(row[3]),
            "is_example": bool(row[4]),
        }
        for row in result
    ]


def get_sleep_statistics(include_example: bool = False) -> Dict:
    """Compute basic sleep statistics from data stored in DuckDB.
    
    Calculates statistics for exactly STATS_WINDOW_DAYS days.
    - If today has data: includes today and the previous (STATS_WINDOW_DAYS - 1) days
    - If today has no data: includes the previous STATS_WINDOW_DAYS days (excluding today)
    
    This ensures the window always covers exactly STATS_WINDOW_DAYS days, even if some
    days in the window don't have data yet.
    
    Args:
        include_example: If True, include example/dummy data from example_sleep_data table. If False, exclude it.
    """
    from datetime import date, timedelta
    from backend.config import STATS_WINDOW_DAYS
    
    today = date.today()
    today_str = today.isoformat()
    stats_window = STATS_WINDOW_DAYS()
    
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        # Check if today's data exists (considering include_example flag)
        if include_example:
            # Only check example data table (when use_dummy_data=True, ignore real data completely)
            today_exists = conn.execute(
                "SELECT COUNT(*) FROM example_sleep_data WHERE date = ?",
                [today_str]
            ).fetchone()[0] > 0
        else:
            # Only check real data table (when use_dummy_data=False, ignore example data completely)
            today_exists = conn.execute(
                "SELECT COUNT(*) FROM sleep_data WHERE date = ?",
                [today_str]
            ).fetchone()[0] > 0
        
        # Calculate window boundaries to always get exactly STATS_WINDOW_DAYS days
        if today_exists:
            # Include today: go back (STATS_WINDOW_DAYS - 1) days
            # Example: for 7 days including today, go back 6 days
            window_start = today - timedelta(days=stats_window - 1)
            window_end = today
        else:
            # Exclude today: go back STATS_WINDOW_DAYS days
            # Example: for 7 days excluding today, go back 7 days (yesterday to 7 days ago)
            window_start = today - timedelta(days=stats_window)
            window_end = today - timedelta(days=1)  # Yesterday
        
        window_start_str = window_start.isoformat()
        window_end_str = window_end.isoformat()
        
        # Aggregate totals and counts for the configured window
        # This query will return data only for days that exist in the database
        # within the calculated window
        if include_example:
            # Only example data (when use_dummy_data=True, ignore real data completely)
            agg = conn.execute(
                """
                SELECT
                    COALESCE(SUM(sleep_hours), 0.0) AS total_sleep_hours,
                    COALESCE(SUM(target_hours), 0.0) AS total_target_hours,
                    COALESCE(SUM(debt), 0.0) AS total_debt,
                    COUNT(*) AS days_tracked
                FROM example_sleep_data
                WHERE date >= ? AND date <= ?
                """,
                [window_start_str, window_end_str]
            ).fetchone()
        else:
            # Only real data from sleep_data table (when use_dummy_data=False, ignore example data completely)
            agg = conn.execute(
                """
                SELECT
                    COALESCE(SUM(sleep_hours), 0.0) AS total_sleep_hours,
                    COALESCE(SUM(target_hours), 0.0) AS total_target_hours,
                    COALESCE(SUM(debt), 0.0) AS total_debt,
                    COUNT(*) AS days_tracked
                FROM sleep_data
                WHERE date >= ? AND date <= ?
                """,
                [window_start_str, window_end_str]
            ).fetchone()

    total_sleep_hours = float(agg[0])
    total_target_hours = float(agg[1])
    total_debt = float(agg[2])
    days_tracked = int(agg[3])

    # If no data, expose neutral statistics
    if days_tracked == 0:
        return {
            "total_sleep_hours": 0.0,
            "target_sleep_hours": 0.0,
            "current_debt": 0.0,
            "days_tracked": 0,
            "has_today_data": today_exists,
        }

    # Return total_debt as-is (negative values represent surplus that can offset future deficits)
    # The frontend will limit the display to 0 for user-facing presentation
    return {
        "total_sleep_hours": total_sleep_hours,
        "target_sleep_hours": total_target_hours,
        "current_debt": total_debt,
        "days_tracked": days_tracked,
        "has_today_data": today_exists,
    }


def count_available_days_in_window(window_days: int, include_example: bool = False) -> int:
    """Count how many days of data exist in the requested window.
    
    Args:
        window_days: Number of days in the window to check
        include_example: If True, include example/dummy data from example_sleep_data table. If False, exclude it.
        
    Returns:
        Number of days with data available in the window
    """
    from datetime import date, timedelta
    
    today = date.today()
    today_str = today.isoformat()
    
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        # Check if today's data exists (considering include_example flag)
        if include_example:
            # Only check example data table (when use_dummy_data=True, ignore real data completely)
            today_exists = conn.execute(
                "SELECT COUNT(*) FROM example_sleep_data WHERE date = ?",
                [today_str]
            ).fetchone()[0] > 0
        else:
            today_exists = conn.execute(
                "SELECT COUNT(*) FROM sleep_data WHERE date = ?",
                [today_str]
            ).fetchone()[0] > 0
        
        # Calculate window boundaries (same logic as get_sleep_statistics)
        if today_exists:
            window_start = today - timedelta(days=window_days - 1)
            window_end = today
        else:
            window_start = today - timedelta(days=window_days)
            window_end = today - timedelta(days=1)  # Yesterday
        
        window_start_str = window_start.isoformat()
        window_end_str = window_end.isoformat()
        
        # Count days with data in the window (use only one table based on flag)
        if include_example:
            # Only count from example data table (when use_dummy_data=True, ignore real data completely)
            result = conn.execute(
                """
                SELECT COUNT(*) 
                FROM example_sleep_data
                WHERE date >= ? AND date <= ?
                """,
                [window_start_str, window_end_str]
            ).fetchone()
        else:
            # Only count from real data table (when use_dummy_data=False, ignore example data completely)
            result = conn.execute(
                """
                SELECT COUNT(*) 
                FROM sleep_data
                WHERE date >= ? AND date <= ?
                """,
                [window_start_str, window_end_str]
            ).fetchone()
        
        return int(result[0])


def count_total_real_data_days() -> int:
    """Count total number of days of real data available in the last 35 days.
    
    This is optimized for performance: instead of checking consecutive days (which requires
    multiple queries or complex logic), we simply count how many days of real data exist
    in the last 35 days, which is more than enough for any statistics window (7, 14, or 30 days).
    
    Returns:
        Number of days with real data in the last 35 days (from sleep_data table only)
    """
    from datetime import date, timedelta
    
    today = date.today()
    # Check last 35 days (more than enough for any window: 7, 14, or 30 days)
    start_date = today - timedelta(days=34)  # 35 days total (today + 34 days back)
    end_date = today
    
    start_date_str = start_date.isoformat()
    end_date_str = end_date.isoformat()
    
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        # Single fast query: count all days with real data in the range (from sleep_data table only)
        result = conn.execute(
            """
            SELECT COUNT(DISTINCT date)
            FROM sleep_data
            WHERE date >= ? AND date <= ?
            """,
            [start_date_str, end_date_str]
        ).fetchone()
        
        return int(result[0]) if result else 0


def delete_example_data() -> int:
    """Delete all example/dummy data from the example_sleep_data table.
    
    Returns:
        Number of records deleted
    """
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        result = conn.execute("DELETE FROM example_sleep_data")
        return result.rowcount if hasattr(result, 'rowcount') else 0


def delete_all_sleep_data() -> int:
    """Delete all sleep data from the database (for testing/first access simulation).
    
    Returns:
        Number of records deleted
    """
    with get_connection() as conn:
        result = conn.execute("DELETE FROM sleep_data")
        return result.rowcount if hasattr(result, 'rowcount') else 0


def count_example_data_in_window(window_days: int) -> int:
    """Count how many days of example data exist in the requested window.
    
    Args:
        window_days: Number of days in the window to check
        
    Returns:
        Number of days with example data in the window (from example_sleep_data table)
    """
    from datetime import date, timedelta
    
    today = date.today()
    today_str = today.isoformat()
    
    with get_connection() as conn:
        # Ensure tables exist
        init_database()
        
        # Check if today's data exists in either table
        today_exists = (
            conn.execute("SELECT COUNT(*) FROM sleep_data WHERE date = ?", [today_str]).fetchone()[0] > 0
            or conn.execute("SELECT COUNT(*) FROM example_sleep_data WHERE date = ?", [today_str]).fetchone()[0] > 0
        )
        
        # Calculate window boundaries (same logic as get_sleep_statistics)
        if today_exists:
            window_start = today - timedelta(days=window_days - 1)
            window_end = today
        else:
            window_start = today - timedelta(days=window_days)
            window_end = today - timedelta(days=1)  # Yesterday
        
        window_start_str = window_start.isoformat()
        window_end_str = window_end.isoformat()
        
        # Count days with example data in the window (from example_sleep_data table)
        result = conn.execute(
            """
            SELECT COUNT(*) 
            FROM example_sleep_data
            WHERE date >= ? AND date <= ?
            """,
            [window_start_str, window_end_str]
        ).fetchone()
        
        return int(result[0])


def get_last_sync_time() -> str | None:
    """Get the last synchronization timestamp from metadata.
    
    Returns:
        ISO format timestamp string, or None if no sync has been performed
    """
    with get_connection() as conn:
        result = conn.execute(
            "SELECT value FROM app_metadata WHERE key = ?",
            ["last_sync"]
        ).fetchone()
        
        if result and result[0]:
            return result[0]
        return None


def set_last_sync_time(timestamp: str) -> bool:
    """Update the last synchronization timestamp in metadata.
    
    Args:
        timestamp: ISO format timestamp string
        
    Returns:
        True if successful
    """
    from datetime import datetime
    now = datetime.now().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO app_metadata (key, value, updated_at)
            VALUES ('last_sync', ?, ?)
            ON CONFLICT (key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            [timestamp, now]
        )
    return True


def get_user_settings() -> Optional[Dict[str, Any]]:
    """Get user settings from database.
    
    Returns:
        Dictionary with 'target_sleep_hours' and 'stats_window_days' if settings exist,
        None otherwise.
    """
    # Ensure database is initialized (table exists)
    init_database()
    
    with get_connection() as conn:
        # Ensure table exists (defensive check)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP
            )
            """
        )
        
        target_result = conn.execute(
            "SELECT value FROM user_settings WHERE key = ?",
            ["target_sleep_hours"]
        ).fetchone()
        
        stats_result = conn.execute(
            "SELECT value FROM user_settings WHERE key = ?",
            ["stats_window_days"]
        ).fetchone()
        
        use_dummy_result = conn.execute(
            "SELECT value FROM user_settings WHERE key = ?",
            ["use_dummy_data"]
        ).fetchone()
        
        if target_result and stats_result:
            result = {
                "target_sleep_hours": float(target_result[0]),
                "stats_window_days": int(stats_result[0])
            }
            # use_dummy_data defaults to False if not set
            if use_dummy_result:
                result["use_dummy_data"] = use_dummy_result[0].lower() == "true"
            else:
                result["use_dummy_data"] = False
            return result
        return None


def update_user_settings(target_hours: float, stats_window_days: int, use_dummy_data: bool = False) -> bool:
    """Update user settings in database.
    
    Args:
        target_hours: Target sleep hours per day
        stats_window_days: Number of days for statistics window
        use_dummy_data: Whether to use dummy data instead of real Garmin data (default: False)
        
    Returns:
        True if successful
    """
    from datetime import datetime
    # Ensure database is initialized (table exists)
    init_database()
    
    # Use datetime object instead of ISO string - DuckDB will handle conversion
    now = datetime.now()
    
    with get_connection() as conn:
        # Ensure table exists (defensive check)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP
            )
            """
        )
        
        # Update or insert target_sleep_hours
        conn.execute(
            """
            INSERT INTO user_settings (key, value, updated_at)
            VALUES ('target_sleep_hours', ?, ?)
            ON CONFLICT (key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            [str(target_hours), now]
        )
        
        # Update or insert stats_window_days
        conn.execute(
            """
            INSERT INTO user_settings (key, value, updated_at)
            VALUES ('stats_window_days', ?, ?)
            ON CONFLICT (key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            [str(stats_window_days), now]
        )
        
        # Update or insert use_dummy_data
        conn.execute(
            """
            INSERT INTO user_settings (key, value, updated_at)
            VALUES ('use_dummy_data', ?, ?)
            ON CONFLICT (key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            [str(use_dummy_data).lower(), now]
        )
    
    return True


def migrate_settings_from_env() -> bool:
    """Migrate settings from .env file to database if they don't exist.
    
    This function reads TARGET_SLEEP_HOURS and STATS_WINDOW_DAYS from backend.config
    and stores them in the database if user_settings table is empty.
    
    Returns:
        True if migration was performed, False if settings already existed
    """
    # Check if settings already exist
    existing_settings = get_user_settings()
    if existing_settings is not None:
        return False  # Settings already exist, no migration needed
    
    # Read from config (which reads from .env)
    from backend.config import TARGET_SLEEP_HOURS, STATS_WINDOW_DAYS
    
    # Migrate to database with default use_dummy_data=False
    update_user_settings(TARGET_SLEEP_HOURS(), STATS_WINDOW_DAYS(), use_dummy_data=False)
    return True


def recalculate_debt_for_all_records(target_hours: float) -> int:
    """Recalculate debt for all sleep records using new target hours.
    
    This function updates both sleep_data and example_sleep_data tables,
    since either table may be in use depending on the use_dummy_data setting.
    
    Args:
        target_hours: New target sleep hours to use for recalculation
        
    Returns:
        Number of records updated (across both tables)
    """
    # Ensure database is initialized
    init_database()
    
    total_updated = 0
    
    with get_connection() as conn:
        # Recalculate debt for sleep_data table
        try:
            records = conn.execute(
                """
                SELECT date, sleep_hours, target_hours
                FROM sleep_data
                ORDER BY date
                """
            ).fetchall()
            
            if records:
                for record in records:
                    try:
                        date_str = record[0] if isinstance(record[0], str) else str(record[0])
                        sleep_hours = float(record[1]) if record[1] is not None else 0.0
                        # Calculate new debt: debt = target_hours - sleep_hours
                        new_debt = target_hours - sleep_hours
                        
                        conn.execute(
                            """
                            UPDATE sleep_data
                            SET debt = ?, target_hours = ?
                            WHERE date = ?
                            """,
                            [new_debt, target_hours, date_str]
                        )
                        total_updated += 1
                    except Exception:
                        # Skip records that can't be updated
                        continue
        except Exception:
            # Table might not exist or might be empty
            pass
        
        # Recalculate debt for example_sleep_data table
        try:
            example_records = conn.execute(
                """
                SELECT date, sleep_hours, target_hours
                FROM example_sleep_data
                ORDER BY date
                """
            ).fetchall()
            
            if example_records:
                for record in example_records:
                    try:
                        date_str = record[0] if isinstance(record[0], str) else str(record[0])
                        sleep_hours = float(record[1]) if record[1] is not None else 0.0
                        # Calculate new debt: debt = target_hours - sleep_hours
                        new_debt = target_hours - sleep_hours
                        
                        conn.execute(
                            """
                            UPDATE example_sleep_data
                            SET debt = ?, target_hours = ?
                            WHERE date = ?
                            """,
                            [new_debt, target_hours, date_str]
                        )
                        total_updated += 1
                    except Exception:
                        # Skip records that can't be updated
                        continue
        except Exception:
            # Table might not exist or might be empty
            pass
        
        return total_updated

