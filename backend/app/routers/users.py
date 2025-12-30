"""
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user, hash_password, verify_password
from app.schemas.user import UserAddressUpdate, ChangePassword, UpdatePhone
from app import models

router = APIRouter()

@router.put("/profile")
def update_profile(data: dict, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user profile"""
    allowed_fields = ["name", "email", "address", "addresses"]
    db_user = db.query(models.User).filter(models.User.id == user["id"]).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_fields = []
    for k, v in data.items():
        if k in allowed_fields and hasattr(db_user, k):
            old_value = getattr(db_user, k)
            if old_value != v:
                setattr(db_user, k, v)
                updated_fields.append(k)
    
    if updated_fields:
        db.commit()
    
    return {"message": "Profile updated successfully", "updated_fields": updated_fields}

@router.put("/change-password")
def change_password(data: ChangePassword, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Change user password"""
    user_obj = db.query(models.User).filter(models.User.id == user["id"]).first()
    
    if not user_obj or not verify_password(data.current_password, user_obj.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    user_obj.password = hash_password(data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.put("/addresses")
def update_addresses(data: UserAddressUpdate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user addresses"""
    db_user = db.query(models.User).filter(models.User.id == user["id"]).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.addresses = data.addresses
    db.commit()
    
    return {"message": "Addresses updated successfully"}