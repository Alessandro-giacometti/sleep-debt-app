"""Garmin data synchronization (stub)."""
from datetime import datetime, timedelta
from typing import List, Dict
from etl.sleep_debt import calculate_sleep_debt, calculate_daily_debt
from db.database import write_sleep_data


def sync_sleep_data(days: int = 30) -> Dict:
    """
    Sync sleep data from Garmin (stub - simulates fetch).
    
    Args:
        days: Number of days to sync
        
    Returns:
        Dictionary with sync results
    """
    print(f"[STUB] Syncing sleep data from Garmin for last {days} days...")
    
    # Simulate fetching data from Garmin
    fake_garmin_data = []
    today = datetime.now()
    
    for i in range(days):
        date = (today - timedelta(days=i))
        # Generate fake sleep data
        sleep_hours = 7.0 + (i % 4) * 0.5  # Varies between 7.0 and 8.5
        target_hours = 8.0
        debt = calculate_daily_debt(sleep_hours, target_hours)
        
        fake_garmin_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "sleep_hours": sleep_hours,
            "target_hours": target_hours,
            "debt": debt
        })
    
    # Calculate total debt
    total_debt = calculate_sleep_debt(fake_garmin_data)
    
    # Write to database (stub)
    records_written = 0
    for record in fake_garmin_data:
        write_sleep_data(
            record["date"],
            record["sleep_hours"],
            record["target_hours"],
            record["debt"]
        )
        records_written += 1
    
    print(f"[STUB] Sync complete: {records_written} records processed")
    
    return {
        "success": True,
        "records_synced": records_written,
        "last_sync": datetime.now().isoformat(),
        "total_debt": total_debt
    }

