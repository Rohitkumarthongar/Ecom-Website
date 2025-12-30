"""
Settings Model
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from datetime import datetime

from app.core.database import Base


class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(20), unique=True)  # business
    business_name = Column(String(100))
    company_name = Column(String(100), nullable=True)
    gst_number = Column(String(20), nullable=True)
    address = Column(JSON, nullable=True)
    phone = Column(String(15), nullable=True)
    email = Column(String(100), nullable=True)
    logo_url = Column(Text, nullable=True)
    favicon_url = Column(Text, nullable=True)
    social_links = Column(JSON, nullable=True)
    configs = Column(JSON, nullable=True)  # invoice_prefix, etc
    
    # Email Configuration (for OTP and notifications)
    email_enabled = Column(String(10), default="false")  # "true" or "false"
    smtp_host = Column(String(100), nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(100), nullable=True)
    smtp_password = Column(String(200), nullable=True)
    
    # SMS/Twilio Configuration (for OTP)
    sms_enabled = Column(String(10), default="false")  # "true" or "false"
    sms_provider = Column(String(20), default="console")  # console, twilio, msg91
    twilio_account_sid = Column(String(200), nullable=True)
    twilio_auth_token = Column(String(200), nullable=True)
    twilio_phone_number = Column(String(20), nullable=True)
    
    # MSG91 Configuration (alternative for India)
    msg91_auth_key = Column(String(200), nullable=True)
    msg91_sender_id = Column(String(20), nullable=True)
    msg91_template_id = Column(String(100), nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow)
