"""
Notification Model
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, JSON
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    type = Column(String(50))
    title = Column(String(100))
    message = Column(Text)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    data = Column(JSON, nullable=True)
    for_admin = Column(Boolean, default=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
