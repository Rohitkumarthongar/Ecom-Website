"""
Category endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models

router = APIRouter()

@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    """Get all active categories"""
    categories = db.query(models.Category).filter(models.Category.is_active == True).all()
    return categories

@router.get("/{category_id}")
def get_category(category_id: str, db: Session = Depends(get_db)):
    """Get single category by ID"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category