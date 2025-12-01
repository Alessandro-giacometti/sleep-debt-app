"""DuckDB database initialization and operations (stub)."""
import duckdb
from pathlib import Path
from backend.config import DB_PATH


def init_database():
    """Initialize DuckDB database and create tables."""
    # Ensure database directory exists
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    
    # Connect to DuckDB
    conn = duckdb.connect(DB_PATH)
    
    # Create sleep_data table if it doesn't exist
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sleep_data (
            date DATE PRIMARY KEY,
            sleep_hours REAL,
            target_hours REAL,
            debt REAL
        )
    """)
    
    conn.close()
    return True


def write_sleep_data(date: str, sleep_hours: float, target_hours: float, debt: float):
    """Write sleep data to database (stub - currently just logs)."""
    # Stub implementation - in real version would insert/update in DuckDB
    print(f"[STUB] Writing sleep data: date={date}, sleep={sleep_hours}h, target={target_hours}h, debt={debt}h")
    return True


def read_sleep_data(limit: int = 30):
    """Read recent sleep data from database (stub - returns fake data)."""
    # Stub implementation - returns fake data
    from datetime import datetime, timedelta
    
    fake_data = []
    today = datetime.now()
    for i in range(limit):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        fake_data.append({
            "date": date,
            "sleep_hours": 7.5 + (i % 3) * 0.5,
            "target_hours": 8.0,
            "debt": -0.5 + (i % 2) * 1.0
        })
    
    return fake_data


def get_sleep_statistics():
    """Get sleep statistics from database (stub - returns fake stats)."""
    # Stub implementation
    return {
        "total_sleep_hours": 225.5,
        "target_sleep_hours": 240.0,
        "current_debt": 14.5,
        "days_tracked": 30
    }

