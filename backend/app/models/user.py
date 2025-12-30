"""
User and OTP Models
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    phone = Column(String(15), unique=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, nullable=True)
    password = Column(String(255))
    gst_number = Column(String(20), nullable=True)
    is_gst_verified = Column(Boolean, default=False)
    is_wholesale = Column(Boolean, default=False)
    is_seller = Column(Boolean, default=False)
    supplier_status = Column(String(20), default="none")  # none, pending, approved, rejected
    role = Column(String(20), default="customer")  # customer, seller, admin
    
    # Storing address as JSON to keep it simple compatible with current frontend structure
    address = Column(JSON, nullable=True) 
    addresses = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="user")
    returns = relationship("ReturnRequest", back_populates="user")


class OTP(Base):
    __tablename__ = "otps"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(15), index=True)
    otp = Column(String(6))
    expiry = Column(DateTime)
    verified = Column(Boolean, default=False)
