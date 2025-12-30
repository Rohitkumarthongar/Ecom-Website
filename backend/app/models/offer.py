"""
Offer Model
"""
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, JSON
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class Offer(Base):
    __tablename__ = "offers"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    title = Column(String(100))
    description = Column(Text, nullable=True)
    discount_type = Column(String(20))  # percentage, flat
    discount_value = Column(Float)
    min_order_value = Column(Float, default=0)
    max_discount = Column(Float, nullable=True)
    coupon_code = Column(String(20), nullable=True)
    product_ids = Column(JSON, default=list)
    category_ids = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
