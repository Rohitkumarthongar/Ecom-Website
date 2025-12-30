"""
Utility functions
"""
import uuid
import random
import string
from datetime import datetime
from typing import Optional

def generate_id() -> str:
    """Generate a unique UUID string"""
    return str(uuid.uuid4())

def generate_order_number() -> str:
    """Generate a unique order number"""
    timestamp = datetime.now().strftime("%y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"ORD{timestamp}{random_part}"

def generate_invoice_number() -> str:
    """Generate a unique invoice number"""
    timestamp = datetime.now().strftime("%y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"INV{timestamp}{random_part}"

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))