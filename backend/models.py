"""Pydantic models for API requests and responses."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SleepData(BaseModel):
    """Sleep data model."""
    date: str
    sleep_hours: float
    target_hours: float
    debt: float


class SleepStatusResponse(BaseModel):
    """Response model for sleep status endpoint."""
    last_sync: Optional[str]
    current_debt: float
    total_sleep_hours: float
    target_sleep_hours: float
    days_tracked: int
    recent_data: list[SleepData]
    has_today_data: bool  # True if sleep data exists for today


class SyncResponse(BaseModel):
    """Response model for sync endpoint."""
    success: bool
    message: str
    records_synced: int
    last_sync: str

