"""
Order, Return, and Cancellation Models
"""
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    order_number = Column(String(20), unique=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    customer_phone = Column(String(15), nullable=True)
    
    # Storing items as JSON for simplicity
    items = Column(JSON) 
    
    subtotal = Column(Float)
    gst_applied = Column(Boolean, default=True)
    gst_total = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    grand_total = Column(Float)
    
    shipping_address = Column(JSON)
    payment_method = Column(String(20))  # cod, online
    payment_status = Column(String(20), default="pending")
    status = Column(String(20), default="pending")
    
    is_offline = Column(Boolean, default=False)
    tracking_number = Column(String(50), nullable=True)
    courier_provider = Column(String(50), nullable=True)
    
    tracking_history = Column(JSON, default=list)
    notes = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")


class ReturnRequest(Base):
    __tablename__ = "returns"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    order_id = Column(String(36), ForeignKey("orders.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    
    items = Column(JSON)
    reason = Column(Text)
    return_type = Column(String(20), default="defective")
    refund_method = Column(String(20))
    status = Column(String(20), default="pending")
    refund_amount = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Evidence for returns
    evidence_images = Column(JSON, default=list)
    evidence_videos = Column(JSON, default=list)
    
    # Courier tracking for returns
    return_awb = Column(String(50), nullable=True)
    courier_provider = Column(String(50), nullable=True)
    pickup_scheduled_date = Column(DateTime, nullable=True)
    pickup_completed_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, nullable=True)
    
    # Admin fields
    admin_notes = Column(Text, nullable=True)
    processed_by = Column(String(36), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="returns")


class OrderCancellation(Base):
    __tablename__ = "order_cancellations"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    order_id = Column(String(36), ForeignKey("orders.id"))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    reason = Column(Text)
    cancellation_type = Column(String(20), default="customer")
    cancelled_by = Column(String(36), nullable=True)
    refund_amount = Column(Float, nullable=True)
    refund_status = Column(String(20), default="pending")
    
    # Shipment cancellation details
    shipment_cancelled = Column(Boolean, default=False)
    shipment_cancel_response = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
