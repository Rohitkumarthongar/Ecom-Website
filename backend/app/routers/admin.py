"""
Admin endpoints
"""
from fastapi import APIRouter, Depends
from app.core.security import admin_required

router = APIRouter()

@router.get("/dashboard")
def admin_dashboard(admin: dict = Depends(admin_required)):
    """Admin dashboard endpoint"""
    return {"message": "Admin dashboard", "admin": admin["name"]}

# TODO: Add all admin endpoints from original server.py
# - Product management
# - Order management  
# - User management
# - Settings management
# etc.