"""
Product endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional

from app.core.database import get_db
from app import models

router = APIRouter()

@router.get("/")
def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get products with filtering and pagination"""
    query = db.query(models.Product).filter(models.Product.is_active == True)
    
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Product.name.like(search_pattern),
                models.Product.description.like(search_pattern),
                models.Product.sku.like(search_pattern)
            )
        )
    if min_price:
        query = query.filter(models.Product.selling_price >= min_price)
    if max_price:
        query = query.filter(models.Product.selling_price <= max_price)
        
    # Sorting
    sort_attr = getattr(models.Product, sort_by, models.Product.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(asc(sort_attr))
        
    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()
    
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get single product by ID"""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product