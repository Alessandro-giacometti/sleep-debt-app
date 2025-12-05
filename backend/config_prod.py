"""Production-specific configuration overrides."""
from pathlib import Path

# Production database path (absolute path for Raspberry Pi)
PROD_DB_PATH = "/opt/sleep-debt-app/data/sleep_debt.db"

# Production API configuration
PROD_API_HOST = "0.0.0.0"
PROD_API_PORT = 8000

# Production CORS - restrict to specific origins in production
PROD_CORS_ORIGINS = []  # Empty list means no CORS (or configure specific domains)

# Production paths
PROD_APP_DIR = Path("/opt/sleep-debt-app")
PROD_VENV_DIR = PROD_APP_DIR / "venv"
PROD_DATA_DIR = PROD_APP_DIR / "data"

