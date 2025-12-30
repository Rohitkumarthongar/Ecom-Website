"""
Notification endpoints
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/")
def get_user_notifications(user: dict = Depends(get_current_user)):
    """Get user notifications"""
    # TODO: Implement notification logic from original server.py
    return {"message": "Notifications endpoint - TODO: implement"}

@router.get("/unread-count")
def get_unread_notification_count(user: dict = Depends(get_current_user)):
    """Get unread notification count"""
    # TODO: Implement unread count logic
    return {"unread_count": 0}