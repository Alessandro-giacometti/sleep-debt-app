"""Garmin data synchronization (currently using simulated data)."""
from datetime import datetime, timedelta
from typing import Dict, List

from etl.sleep_debt import calculate_sleep_debt, calculate_daily_debt
from db.database import write_sleep_batch


def _generate_fake_sleep_data(days: int) -> List[Dict]:
    """Generate fake sleep data for a given number of days."""
    fake_data: List[Dict] = []
    today = datetime.now()

    for i in range(days):
        date = today - timedelta(days=i)
        # Generate fake sleep data
        sleep_hours = 7.0 + (i % 4) * 0.5  # Varies between 7.0 and 8.5
        target_hours = 8.0
        debt = calculate_daily_debt(sleep_hours, target_hours)

        fake_data.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "sleep_hours": sleep_hours,
                "target_hours": target_hours,
                "debt": debt,
            }
        )

    return fake_data


def sync_sleep_data(days: int = 30) -> Dict:
    """Sync sleep data (currently simulated) and persist it to DuckDB.

    This function is structured so it can later be extended to use real
    Garmin Connect data. For ora usa solo dati finti ma scrive davvero
    nel database.
    """
    print(f"[SYNC] Starting sleep data sync for last {days} days...")

    # TODO (Fase 2): replace this with real Garmin fetch
    sleep_data = _generate_fake_sleep_data(days)

    # Calculate total debt on the dataset
    total_debt = calculate_sleep_debt(sleep_data)

    # Persist to DuckDB (real DB operations)
    records_written = write_sleep_batch(sleep_data)

    print(f"[SYNC] Sync complete: {records_written} records written to DuckDB")

    return {
        "success": True,
        "records_synced": records_written,
        "last_sync": datetime.now().isoformat(),
        "total_debt": total_debt,
    }

