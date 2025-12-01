"""FastAPI application with sleep debt endpoints."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from backend.models import SleepStatusResponse, SyncResponse, SleepData
from backend.config import API_HOST, API_PORT
from db.database import init_database, read_sleep_data, get_sleep_statistics
from etl.garmin_sync import sync_sleep_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    init_database()
    print("Database initialized")
    yield
    # Shutdown (if needed in future)
    pass


# Initialize FastAPI app
app = FastAPI(title="Sleep Debt Tracker", version="0.1.0", lifespan=lifespan)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for frontend assets (after middleware, before routes)
app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
async def root():
    """Root endpoint - serve frontend HTML."""
    with open("frontend/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/sleep/status", response_model=SleepStatusResponse)
async def get_sleep_status():
    """Get current sleep status and statistics."""
    # Get statistics (stub)
    stats = get_sleep_statistics()
    
    # Get recent data (stub)
    recent_data = read_sleep_data(limit=7)
    
    return SleepStatusResponse(
        last_sync=datetime.now().isoformat(),
        current_debt=stats["current_debt"],
        total_sleep_hours=stats["total_sleep_hours"],
        target_sleep_hours=stats["target_sleep_hours"],
        days_tracked=stats["days_tracked"],
        recent_data=[SleepData(**item) for item in recent_data]
    )


@app.post("/api/sleep/sync", response_model=SyncResponse)
async def sync_sleep():
    """Trigger sleep data synchronization from Garmin."""
    try:
        result = sync_sleep_data(days=30)
        
        return SyncResponse(
            success=result["success"],
            message=f"Synced {result['records_synced']} records",
            records_synced=result["records_synced"],
            last_sync=result["last_sync"]
        )
    except Exception as e:
        return SyncResponse(
            success=False,
            message=f"Sync failed: {str(e)}",
            records_synced=0,
            last_sync=datetime.now().isoformat()
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)

