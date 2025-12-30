"""
Authentication schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional

class OTPRequest(BaseModel):
    phone: str
    email: Optional[EmailStr] = None

class OTPVerify(BaseModel):
    phone: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None