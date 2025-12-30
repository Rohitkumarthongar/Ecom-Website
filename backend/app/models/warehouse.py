"""
Warehouse and Inventory Models
"""
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    product_id = Column(String(36), ForeignKey("products.id"))
    sku = Column(String(50))
    type = Column(String(20))  # adjustment, sale, return
    quantity = Column(Integer)
    previous_qty = Column(Integer, nullable=True)
    new_qty = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
