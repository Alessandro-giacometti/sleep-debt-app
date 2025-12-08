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
    is_example: bool = False  # True if this is example/dummy data


class SleepStatusResponse(BaseModel):
    """Response model for sleep status endpoint."""
    last_sync: Optional[str]
    current_debt: float
    total_sleep_hours: float
    target_sleep_hours: float
    days_tracked: int
    recent_data: list[SleepData]
    has_today_data: bool  # True if sleep data exists for today
    stats_window_days: int  # Number of days used for statistics calculation
    total_real_data_days: int = 0  # Total number of consecutive days with real data available


class SyncResponse(BaseModel):
    """Response model for sync endpoint."""
    success: bool
    message: str
    records_synced: int
    last_sync: str
    used_dummy_data: bool = False  # True if dummy data was used instead of real Garmin data


class SettingsRequest(BaseModel):
    """Request model for updating user settings."""
    target_sleep_hours: float
    stats_window_days: int
    use_dummy_data: bool = False


class SettingsResponse(BaseModel):
    """Response model for settings endpoint."""
    target_sleep_hours: float
    stats_window_days: int
    use_dummy_data: bool = False
    updated_at: Optional[str]

