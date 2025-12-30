"""
File upload endpoints
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from typing import List, Optional
import shutil
import uuid
from pathlib import Path
from PIL import Image
import logging

from app.core.security import admin_required
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def generate_filename(original_filename: str) -> str:
    """Generate unique filename"""
    extension = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    return f"{uuid.uuid4()}.{extension}"

def save_uploaded_file(file: UploadFile, folder: str = "general", image_type: str = None) -> str:
    """Save uploaded file and return the URL"""
    try:
        # Create folder if it doesn't exist
        folder_path = UPLOAD_DIR / folder
        folder_path.mkdir(exist_ok=True)
        
        # Generate unique filename
        unique_filename = generate_filename(file.filename)
        file_path = folder_path / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Optimize image if it's an image file
        if file.content_type and file.content_type.startswith('image/'):
            optimize_image(file_path, image_type=image_type or "general")
        
        # Return URL
        return f"/uploads/{folder}/{unique_filename}"
        
    except Exception as e:
        logger.error(f"Failed to save file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

def optimize_image(file_path: Path, image_type: str = "general"):
    """Optimize image size and quality"""
    try:
        with Image.open(file_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                if image_type in ['logo', 'favicon']:
                    if img.mode != 'RGBA':
                        img = img.convert('RGBA')
                else:
                    img = img.convert('RGB')
            
            # Specific sizing for different image types
            if image_type == 'logo':
                img.thumbnail((400, 120), Image.Resampling.LANCZOS)
            elif image_type == 'favicon':
                img = img.resize((32, 32), Image.Resampling.LANCZOS)
            elif image_type == 'banner':
                img = img.resize((1200, 400), Image.Resampling.LANCZOS)
            elif image_type == 'category':
                # Make square
                width, height = img.size
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                img = img.crop((left, top, left + size, top + size))
                img = img.resize((500, 500), Image.Resampling.LANCZOS)
            elif image_type == 'product':
                # Make square
                width, height = img.size
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                img = img.crop((left, top, left + size, top + size))
                img = img.resize((800, 800), Image.Resampling.LANCZOS)
            else:
                # General: max 1200x1200
                img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            
            # Save optimized image
            if img.mode == 'RGBA' and file_path.suffix.lower() in ['.jpg', '.jpeg']:
                # Convert RGBA to RGB for JPEG
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
                img.save(file_path, optimize=True, quality=85)
            else:
                img.save(file_path, optimize=True, quality=85)
            
    except Exception as e:
        logger.warning(f"Failed to optimize image {file_path}: {str(e)}")

def delete_uploaded_file(file_url: str):
    """Delete uploaded file"""
    try:
        if file_url and file_url.startswith('/uploads/'):
            file_path = Path(file_url[1:])  # Remove leading slash
            if file_path.exists():
                file_path.unlink()
    except Exception as e:
        logger.warning(f"Failed to delete file {file_url}: {str(e)}")

@router.post("/image")
def upload_image(
    file: UploadFile = File(...),
    folder: str = "general",
    image_type: Optional[str] = None,
    admin: dict = Depends(admin_required)
):
    """Upload single image with automatic optimization"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check file size (10MB limit)
    if hasattr(file, 'size') and file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    file_url = save_uploaded_file(file, folder, image_type)
    
    return {
        "message": "Image uploaded and optimized successfully",
        "url": file_url,
        "filename": file.filename,
        "optimized_for": image_type or folder
    }

@router.post("/logo")
def upload_logo(
    file: UploadFile = File(...),
    admin: dict = Depends(admin_required)
):
    """Upload and optimize logo image"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_url = save_uploaded_file(file, "branding", "logo")
    
    return {
        "message": "Logo uploaded and optimized successfully",
        "url": file_url,
        "filename": file.filename,
        "optimized_size": "400x120 max (aspect ratio preserved)"
    }

@router.post("/favicon")
def upload_favicon(
    file: UploadFile = File(...),
    admin: dict = Depends(admin_required)
):
    """Upload and optimize favicon image"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_url = save_uploaded_file(file, "branding", "favicon")
    
    return {
        "message": "Favicon uploaded and optimized successfully",
        "url": file_url,
        "filename": file.filename,
        "optimized_size": "32x32 pixels"
    }

@router.post("/multiple")
def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = "general",
    image_type: Optional[str] = None,
    admin: dict = Depends(admin_required)
):
    """Upload multiple image files with automatic optimization"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed")
    
    uploaded_files = []
    for file in files:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            continue
        
        try:
            file_url = save_uploaded_file(file, folder, image_type)
            uploaded_files.append({
                "url": file_url,
                "filename": file.filename
            })
        except Exception as e:
            logger.error(f"Failed to upload {file.filename}: {str(e)}")
            continue
    
    return {
        "message": f"Uploaded and optimized {len(uploaded_files)} images successfully",
        "files": uploaded_files,
        "optimized_for": image_type or folder
    }

@router.delete("/delete")
def delete_image(
    file_url: str = Query(..., description="URL of the file to delete"),
    admin: dict = Depends(admin_required)
):
    """Delete an uploaded image"""
    delete_uploaded_file(file_url)
    return {"message": "Image deleted successfully"}