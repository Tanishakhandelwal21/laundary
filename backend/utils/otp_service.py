import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

def generate_otp(length: int = 6) -> str:
    """
    Generate a random OTP code
    """
    return ''.join(random.choices(string.digits, k=length))

def is_otp_expired(created_at: datetime, expiry_minutes: int = 10) -> bool:
    """
    Check if OTP has expired
    """
    now = datetime.now(timezone.utc)
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    
    expiry_time = created_at + timedelta(minutes=expiry_minutes)
    return now > expiry_time