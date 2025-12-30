"""
Product and Category Models
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    name = Column(String(100))
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    parent_id = Column(String(36), ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    name = Column(String(200))
    description = Column(Text, nullable=True)
    sku = Column(String(50), unique=True, index=True)
    category_id = Column(String(36), ForeignKey("categories.id"))
    
    mrp = Column(Float)
    selling_price = Column(Float)
    wholesale_price = Column(Float, nullable=True)
    wholesale_min_qty = Column(Integer, default=10)
    cost_price = Column(Float)
    
    stock_qty = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=10)
    
    images = Column(JSON, default=list)  # List of URLs
    variants = Column(JSON, default=list)
    
    gst_rate = Column(Float, default=18.0)
    hsn_code = Column(String(20), nullable=True)
    weight = Column(Float, nullable=True)
    color = Column(String(50), nullable=True)
    material = Column(String(100), nullable=True)
    origin = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
