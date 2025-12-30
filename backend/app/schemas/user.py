"""
User schemas
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    gst_number: Optional[str] = None
    is_gst_verified: bool = False
    address: Optional[Dict[str, str]] = None
    addresses: Optional[List[Dict[str, str]]] = []
    role: str = "customer"

class UserCreate(BaseModel):
    phone: str
    name: str
    email: Optional[EmailStr] = None
    gst_number: Optional[str] = None
    password: Optional[str] = None
    request_seller: bool = False

class UserLogin(BaseModel):
    identifier: str  # Phone or Email
    password: str

class UserResponse(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: str
    is_seller: bool
    is_wholesale: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserAddressUpdate(BaseModel):
    addresses: List[Dict[str, str]]

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class UpdatePhone(BaseModel):
    phone: str
    otp: str