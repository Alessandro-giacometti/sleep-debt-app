"""Configuration management using environment variables."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration
DB_PATH = os.getenv("DB_PATH", "data/sleep_debt.db")
DB_DIR = Path(DB_PATH).parent
DB_DIR.mkdir(parents=True, exist_ok=True)

# Garmin credentials
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL", "")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD", "")

# API configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Sleep target configuration
TARGET_SLEEP_HOURS = float(os.getenv("TARGET_SLEEP_HOURS", "8.0"))

# Statistics window configuration (in days)
STATS_WINDOW_DAYS = int(os.getenv("STATS_WINDOW_DAYS", "7"))

