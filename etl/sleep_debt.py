"""Sleep debt calculation (stub)."""
from typing import List, Dict


def calculate_sleep_debt(sleep_data: List[Dict]) -> float:
    """
    Calculate cumulative sleep debt from sleep data (stub).
    
    Args:
        sleep_data: List of sleep records with sleep_hours and target_hours
        
    Returns:
        Cumulative sleep debt in hours
    """
    # Stub implementation - returns fake debt value
    print("[STUB] Calculating sleep debt...")
    return 14.5


def calculate_daily_debt(sleep_hours: float, target_hours: float) -> float:
    """
    Calculate debt for a single day (stub).
    
    Args:
        sleep_hours: Actual sleep hours
        target_hours: Target sleep hours
        
    Returns:
        Debt for the day (positive = deficit, negative = surplus)
    """
    # Stub implementation
    return target_hours - sleep_hours

