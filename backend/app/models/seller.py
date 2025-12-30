"""
Seller Request Model
"""
from sqlalchemy import Column, String, ForeignKey, DateTime
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class SellerRequest(Base):
    __tablename__ = "seller_requests"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    user_id = Column(String(36), ForeignKey("users.id"))
    user_name = Column(String(100))
    user_phone = Column(String(15))
    business_name = Column(String(100))
    gst_number = Column(String(20))
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
