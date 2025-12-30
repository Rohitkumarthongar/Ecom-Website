"""
Payment Gateway Model
"""
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class PaymentGateway(Base):
    __tablename__ = "payment_gateways"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    name = Column(String(50))
    merchant_id = Column(String(100), nullable=True)
    api_key = Column(String(100), nullable=True)
    is_test_mode = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
