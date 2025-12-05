"""DuckDB database initialization and operations."""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from typing import Dict, Iterable, List

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
    return True


def write_sleep_data(date: str, sleep_hours: float, target_hours: float, debt: float) -> bool:
    """Insert or update a single day's sleep data in DuckDB."""
    record = SleepRecord(
        date=date,
        sleep_hours=sleep_hours,
        target_hours=target_hours,
        debt=debt,
    )

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sleep_data (date, sleep_hours, target_hours, debt)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (date) DO UPDATE SET
                sleep_hours = excluded.sleep_hours,
                target_hours = excluded.target_hours,
                debt = excluded.debt
            """,
            [record.date, record.sleep_hours, record.target_hours, record.debt],
        )

    return True


def write_sleep_batch(records: Iterable[Dict]) -> int:
    """Insert or update a batch of sleep records.

    Args:
        records: iterable of dicts with keys: date, sleep_hours, target_hours, debt

    Returns:
        Number of records written.
    """
    records_list: List[SleepRecord] = [
        SleepRecord(
            date=r["date"],
            sleep_hours=float(r["sleep_hours"]),
            target_hours=float(r["target_hours"]),
            debt=float(r["debt"]),
        )
        for r in records
    ]

    if not records_list:
        return 0

    with get_connection() as conn:
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
                for r in records_list
            ],
        )

    return len(records_list)


def read_sleep_data(limit: int = None) -> List[Dict]:
    """Read recent sleep data from database ordered by date descending.
    
    Args:
        limit: Number of days to retrieve (defaults to STATS_WINDOW_DAYS from config)
    """
    from backend.config import STATS_WINDOW_DAYS
    if limit is None:
        limit = STATS_WINDOW_DAYS
    with get_connection() as conn:
        result = conn.execute(
            """
            SELECT
                strftime('%Y-%m-%d', date) AS date,
                sleep_hours,
                target_hours,
                debt
            FROM sleep_data
            ORDER BY date DESC
            LIMIT ?
            """,
            [limit],
        ).fetchall()

    return [
        {
            "date": row[0],
            "sleep_hours": float(row[1]),
            "target_hours": float(row[2]),
            "debt": float(row[3]),
        }
        for row in result
    ]


def get_sleep_statistics() -> Dict:
    """Compute basic sleep statistics from data stored in DuckDB.
    
    Calculates statistics for exactly STATS_WINDOW_DAYS days.
    - If today has data: includes today and the previous (STATS_WINDOW_DAYS - 1) days
    - If today has no data: includes the previous STATS_WINDOW_DAYS days (excluding today)
    
    This ensures the window always covers exactly STATS_WINDOW_DAYS days, even if some
    days in the window don't have data yet.
    """
    from datetime import date, timedelta
    from backend.config import STATS_WINDOW_DAYS
    
    today = date.today()
    today_str = today.isoformat()
    
    with get_connection() as conn:
        # Check if today's data exists
        today_exists = conn.execute(
            "SELECT COUNT(*) FROM sleep_data WHERE date = ?",
            [today_str]
        ).fetchone()[0] > 0
        
        # Calculate window boundaries to always get exactly STATS_WINDOW_DAYS days
        if today_exists:
            # Include today: go back (STATS_WINDOW_DAYS - 1) days
            # Example: for 7 days including today, go back 6 days
            window_start = today - timedelta(days=STATS_WINDOW_DAYS - 1)
            window_end = today
        else:
            # Exclude today: go back STATS_WINDOW_DAYS days
            # Example: for 7 days excluding today, go back 7 days (yesterday to 7 days ago)
            window_start = today - timedelta(days=STATS_WINDOW_DAYS)
            window_end = today - timedelta(days=1)  # Yesterday
        
        window_start_str = window_start.isoformat()
        window_end_str = window_end.isoformat()
        
        # Aggregate totals and counts for the configured window
        # This query will return data only for days that exist in the database
        # within the calculated window
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

    return {
        "total_sleep_hours": total_sleep_hours,
        "target_sleep_hours": total_target_hours,
        "current_debt": total_debt,
        "days_tracked": days_tracked,
        "has_today_data": today_exists,
    }


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

