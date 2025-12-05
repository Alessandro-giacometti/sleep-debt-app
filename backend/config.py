"""Configuration management using environment variables."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Environment detection (dev or prod)
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev").lower()

# Import production config if in production
if ENVIRONMENT == "prod":
    try:
        from backend.config_prod import (
            PROD_DB_PATH,
            PROD_API_HOST,
            PROD_API_PORT,
            PROD_CORS_ORIGINS,
            PROD_APP_DIR,
            PROD_DATA_DIR,
        )
    except ImportError:
        # Fallback if config_prod doesn't exist
        PROD_DB_PATH = "data/sleep_debt.db"
        PROD_API_HOST = "0.0.0.0"
        PROD_API_PORT = 8000
        PROD_CORS_ORIGINS = []
        PROD_APP_DIR = Path.cwd()
        PROD_DATA_DIR = PROD_APP_DIR / "data"

# Database configuration
# Separate DB paths for dev and prod to avoid schema/data conflicts
if ENVIRONMENT == "prod":
    DB_PATH = PROD_DB_PATH
    # Ensure production data directory exists
    PROD_DATA_DIR.mkdir(parents=True, exist_ok=True)
else:
    DB_PATH = os.getenv("DB_PATH", "data/sleep_debt.db")

DB_DIR = Path(DB_PATH).parent
DB_DIR.mkdir(parents=True, exist_ok=True)

# Garmin credentials
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL", "")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD", "")

# API configuration
if ENVIRONMENT == "prod":
    API_HOST = PROD_API_HOST
    API_PORT = PROD_API_PORT
else:
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8000"))

# Sleep target configuration
TARGET_SLEEP_HOURS = float(os.getenv("TARGET_SLEEP_HOURS", "8.0"))

# Statistics window configuration (in days)
STATS_WINDOW_DAYS = int(os.getenv("STATS_WINDOW_DAYS", "7"))

# CORS configuration
# Note: Empty list [] in FastAPI CORS blocks ALL requests including same-origin
# Use None to indicate "same-origin only" (no CORS middleware needed for same-origin)
if ENVIRONMENT == "prod":
    # If PROD_CORS_ORIGINS is explicitly set to empty list, use None (same-origin only)
    # If it's a list with origins, use it
    # If it's None/not set, default to None (same-origin only)
    if PROD_CORS_ORIGINS is not None and len(PROD_CORS_ORIGINS) > 0:
        CORS_ORIGINS = PROD_CORS_ORIGINS
    else:
        # None means same-origin only (no CORS needed, but we'll still add middleware for flexibility)
        CORS_ORIGINS = None
else:
    # Development: allow all origins
    CORS_ORIGINS = ["*"]

