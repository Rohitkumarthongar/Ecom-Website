"""
Offer endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models

router = APIRouter()

@router.get("/")
def get_offers(db: Session = Depends(get_db)):
    """Get active offers"""
    offers = db.query(models.Offer).filter(
        models.Offer.is_active == True
    ).all()
    return offers