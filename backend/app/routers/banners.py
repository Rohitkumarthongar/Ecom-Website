"""
Banner endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models

router = APIRouter()

@router.get("/")
def get_banners(db: Session = Depends(get_db)):
    """Get active banners"""
    banners = db.query(models.Banner).filter(
        models.Banner.is_active == True
    ).order_by(models.Banner.position).all()
    return banners