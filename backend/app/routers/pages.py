"""
Pages and content endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import admin_required
from app import models

router = APIRouter()

class ContactMessage(BaseModel):
    name: str
    email: str
    phone: str = ""
    subject: str
    message: str

class PageUpdate(BaseModel):
    title: str = ""
    content: str
    is_active: bool = True

def get_or_create_page(db: Session, slug: str, default_title: str = "", default_content: str = ""):
    """Get or create a page"""
    page = db.query(models.Page).filter(models.Page.slug == slug).first()
    if not page:
        page = models.Page(
            slug=slug,
            title=default_title,
            content=default_content,
            is_active=True
        )
        db.add(page)
        db.commit()
        db.refresh(page)
    return page

@router.get("/privacy-policy")
def get_privacy_policy(db: Session = Depends(get_db)):
    """Get privacy policy page"""
    page = get_or_create_page(
        db, 
        "privacy-policy", 
        "Privacy Policy",
        "This is the privacy policy content. Please update this content from the admin panel."
    )
    return {
        "title": page.title,
        "content": page.content,
        "updated_at": page.updated_at
    }

@router.get("/terms")
def get_terms_of_service(db: Session = Depends(get_db)):
    """Get terms of service page"""
    page = get_or_create_page(
        db, 
        "terms", 
        "Terms of Service",
        "This is the terms of service content. Please update this content from the admin panel."
    )
    return {
        "title": page.title,
        "content": page.content,
        "updated_at": page.updated_at
    }

@router.get("/return-policy")
def get_return_policy(db: Session = Depends(get_db)):
    """Get return policy page"""
    page = get_or_create_page(
        db, 
        "return-policy", 
        "Return Policy",
        "This is the return policy content. Please update this content from the admin panel."
    )
    return {
        "title": page.title,
        "content": page.content,
        "updated_at": page.updated_at
    }

@router.get("/contact")
def get_contact_page(db: Session = Depends(get_db)):
    """Get contact page"""
    page = get_or_create_page(
        db, 
        "contact", 
        "Contact Us",
        "Contact us for any queries or support."
    )
    return {
        "title": page.title,
        "content": page.content,
        "updated_at": page.updated_at
    }

@router.post("/contact")
def submit_contact_form(message: ContactMessage, db: Session = Depends(get_db)):
    """Submit contact form"""
    # TODO: Save contact message to database or send email
    # For now, just return success
    return {
        "message": "Thank you for your message. We will get back to you soon.",
        "success": True
    }

@router.put("/{slug}")
def update_page(slug: str, data: PageUpdate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Update page content (admin only)"""
    page = db.query(models.Page).filter(models.Page.slug == slug).first()
    
    if not page:
        # Create new page
        page = models.Page(
            slug=slug,
            title=data.title,
            content=data.content,
            is_active=data.is_active
        )
        db.add(page)
    else:
        # Update existing page
        if data.title:
            page.title = data.title
        page.content = data.content
        page.is_active = data.is_active
    
    db.commit()
    db.refresh(page)
    
    return {
        "message": "Page updated successfully",
        "page": {
            "slug": page.slug,
            "title": page.title,
            "content": page.content,
            "is_active": page.is_active,
            "updated_at": page.updated_at
        }
    }