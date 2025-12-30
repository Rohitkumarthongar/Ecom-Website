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
    
    updated_at = Column(DateTime, default=datetime.utcnow)
