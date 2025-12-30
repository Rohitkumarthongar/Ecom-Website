"""
Courier Model
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class Courier(Base):
    __tablename__ = "couriers"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    name = Column(String(50))
    api_key = Column(String(100), nullable=True)
    api_secret = Column(String(100), nullable=True)
    webhook_url = Column(String(200), nullable=True)
    tracking_url_template = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
