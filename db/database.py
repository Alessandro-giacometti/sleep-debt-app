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


def read_sleep_data(limit: int = 7) -> List[Dict]:
    """Read recent sleep data from database ordered by date descending."""
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
    
    Calculates statistics only for the configured window of days.
    Excludes today's data if it doesn't exist (to avoid calculating debt
    for an incomplete day).
    """
    from datetime import date, timedelta
    from backend.config import STATS_WINDOW_DAYS
    
    today = date.today()
    window_start = today - timedelta(days=STATS_WINDOW_DAYS)
    today_str = today.isoformat()
    window_start_str = window_start.isoformat()
    
    with get_connection() as conn:
        # Check if today's data exists
        today_exists = conn.execute(
            "SELECT COUNT(*) FROM sleep_data WHERE date = ?",
            [today_str]
        ).fetchone()[0] > 0
        
        # Aggregate totals and counts for the configured window
        # Exclude today if it doesn't exist
        if today_exists:
            # Include window including today
            agg = conn.execute(
                """
                SELECT
                    COALESCE(SUM(sleep_hours), 0.0) AS total_sleep_hours,
                    COALESCE(SUM(target_hours), 0.0) AS total_target_hours,
                    COALESCE(SUM(debt), 0.0) AS total_debt,
                    COUNT(*) AS days_tracked
                FROM sleep_data
                WHERE date >= ?
                """,
                [window_start_str]
            ).fetchone()
        else:
            # Include window excluding today
            agg = conn.execute(
                """
                SELECT
                    COALESCE(SUM(sleep_hours), 0.0) AS total_sleep_hours,
                    COALESCE(SUM(target_hours), 0.0) AS total_target_hours,
                    COALESCE(SUM(debt), 0.0) AS total_debt,
                    COUNT(*) AS days_tracked
                FROM sleep_data
                WHERE date >= ? AND date < ?
                """,
                [window_start_str, today_str]
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

