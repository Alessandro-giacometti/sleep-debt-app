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

# Garmin credentials (stub for now)
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL", "")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD", "")

# API configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

