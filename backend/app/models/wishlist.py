"""
Wishlist and WishlistCategory Models
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.core.utils import generate_id


class WishlistCategory(Base):
    __tablename__ = "wishlist_categories"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    user_id = Column(String(36), ForeignKey("users.id"))
    name = Column(String(100))
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#3B82F6")
    icon = Column(String(50), default="heart")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    wishlist_items = relationship("Wishlist", back_populates="category")


class Wishlist(Base):
    __tablename__ = "wishlists"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    user_id = Column(String(36), ForeignKey("users.id"))
    product_id = Column(String(36), ForeignKey("products.id"))
    category_id = Column(String(36), ForeignKey("wishlist_categories.id"), nullable=True)
    notes = Column(Text, nullable=True)
    priority = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    product = relationship("Product")
    category = relationship("WishlistCategory", back_populates="wishlist_items")
