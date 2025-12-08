"""Sleep debt calculation."""
from typing import List, Dict


def calculate_sleep_debt(sleep_data: List[Dict]) -> float:
    """
    Calculate cumulative sleep debt from sleep data.
    
    The cumulative debt is the sum of all daily debts. Positive values indicate
    a deficit (less sleep than target), negative values indicate a surplus.
    
    Args:
        sleep_data: List of sleep records with 'debt' field (or sleep_hours and target_hours)
        
    Returns:
        Cumulative sleep debt in hours (positive = deficit, negative = surplus)
    """
    if not sleep_data:
        return 0.0
    
    # If records already have 'debt' field, sum them
    if 'debt' in sleep_data[0]:
        total_debt = sum(record.get('debt', 0.0) for record in sleep_data)
    else:
        # Calculate debt from sleep_hours and target_hours if debt not present
        from backend.config import TARGET_SLEEP_HOURS
        total_debt = sum(
            calculate_daily_debt(
                record.get('sleep_hours', 0.0),
                record.get('target_hours', TARGET_SLEEP_HOURS())
            )
            for record in sleep_data
        )
    
    return total_debt


def calculate_daily_debt(sleep_hours: float, target_hours: float) -> float:
    """
    Calculate debt for a single day.
    
    Args:
        sleep_hours: Actual sleep hours
        target_hours: Target sleep hours
        
    Returns:
        Debt for the day (positive = deficit, negative = surplus)
        Formula: debt = target_hours - sleep_hours
    """
    return target_hours - sleep_hours

