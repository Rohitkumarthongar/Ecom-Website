"""
Page Model
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text
from datetime import datetime

from app.core.database import Base


class Page(Base):
    __tablename__ = "pages"
    
    slug = Column(String(50), primary_key=True)  # privacy-policy, terms, contact
    title = Column(String(100))
    content = Column(Text)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
