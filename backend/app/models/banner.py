"""
Banner Model
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class Banner(Base):
    __tablename__ = "banners"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    title = Column(String(100))
    image_url = Column(Text)
    link = Column(String(200), nullable=True)
    position = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
