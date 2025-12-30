"""
File upload endpoints
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List
from app.core.security import admin_required

router = APIRouter()

@router.post("/image")
def upload_image(
    file: UploadFile = File(...),
    folder: str = "general",
    image_type: str = None,
    admin: dict = Depends(admin_required)
):
    """Upload single image"""
    # TODO: Implement image upload logic from original server.py
    return {"message": "Image upload endpoint - TODO: implement"}

@router.post("/multiple")
def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = "general",
    image_type: str = None,
    admin: dict = Depends(admin_required)
):
    """Upload multiple images"""
    # TODO: Implement multiple image upload logic
    return {"message": "Multiple image upload endpoint - TODO: implement"}