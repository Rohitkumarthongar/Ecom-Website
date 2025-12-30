"""
Settings management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.security import admin_required
from app import models

logger = logging.getLogger(__name__)

router = APIRouter()


def get_or_create_settings(db: Session) -> models.Settings:
    """Get existing settings or create default settings"""
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings(
            business_name="BharatBazaar",
            company_name="BharatBazaar Pvt Ltd",
            phone="",
            email="",
            address={},
            social_links={},
            configs={},
            email_enabled="false",
            sms_enabled="false"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


class SettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    company_name: Optional[str] = None
    gst_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[dict] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    upi_id: Optional[str] = None
    enable_gst_billing: Optional[bool] = None
    default_gst_rate: Optional[float] = None
    invoice_prefix: Optional[str] = None
    order_prefix: Optional[str] = None


@router.get("/")
def get_settings(db: Session = Depends(get_db), admin: dict = Depends(admin_required)):
    """Get admin settings"""
    settings = get_or_create_settings(db)
    
    # Parse JSON fields
    address = settings.address or {}
    social_links = settings.social_links or {}
    configs = settings.configs or {}
    
    return {
        "business_name": settings.business_name or "",
        "company_name": settings.company_name or "",
        "gst_number": settings.gst_number or "",
        "phone": settings.phone or "",
        "email": settings.email or "",
        "address": address,
        "logo_url": settings.logo_url or "",
        "favicon_url": settings.favicon_url or "",
        "facebook_url": social_links.get("facebook_url", ""),
        "instagram_url": social_links.get("instagram_url", ""),
        "twitter_url": social_links.get("twitter_url", ""),
        "youtube_url": social_links.get("youtube_url", ""),
        "whatsapp_number": social_links.get("whatsapp_number", ""),
        "upi_id": configs.get("upi_id", ""),
        "enable_gst_billing": configs.get("enable_gst_billing", True),
        "default_gst_rate": configs.get("default_gst_rate", 18.0),
        "invoice_prefix": configs.get("invoice_prefix", "INV"),
        "order_prefix": configs.get("order_prefix", "ORD"),
    }


@router.put("/")
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(admin_required)
):
    """Update admin settings"""
    settings = get_or_create_settings(db)
    
    # Update basic fields
    if data.business_name is not None:
        settings.business_name = data.business_name
    if data.company_name is not None:
        settings.company_name = data.company_name
    if data.gst_number is not None:
        settings.gst_number = data.gst_number
    if data.phone is not None:
        settings.phone = data.phone
    if data.email is not None:
        settings.email = data.email
    if data.logo_url is not None:
        settings.logo_url = data.logo_url
    if data.favicon_url is not None:
        settings.favicon_url = data.favicon_url
    
    # Update address
    if data.address is not None:
        settings.address = data.address
    
    # Update social links
    social_links = settings.social_links or {}
    if data.facebook_url is not None:
        social_links["facebook_url"] = data.facebook_url
    if data.instagram_url is not None:
        social_links["instagram_url"] = data.instagram_url
    if data.twitter_url is not None:
        social_links["twitter_url"] = data.twitter_url
    if data.youtube_url is not None:
        social_links["youtube_url"] = data.youtube_url
    if data.whatsapp_number is not None:
        social_links["whatsapp_number"] = data.whatsapp_number
    settings.social_links = social_links
    
    # Update configs
    configs = settings.configs or {}
    if data.upi_id is not None:
        configs["upi_id"] = data.upi_id
    if data.enable_gst_billing is not None:
        configs["enable_gst_billing"] = data.enable_gst_billing
    if data.default_gst_rate is not None:
        configs["default_gst_rate"] = data.default_gst_rate
    if data.invoice_prefix is not None:
        configs["invoice_prefix"] = data.invoice_prefix
    if data.order_prefix is not None:
        configs["order_prefix"] = data.order_prefix
    settings.configs = configs
    
    db.commit()
    db.refresh(settings)
    
    logger.info(f"Settings updated by admin: {admin['name']}")
    
    return {"message": "Settings updated successfully"}


# Pydantic schemas for settings
class EmailSettingsUpdate(BaseModel):
    email_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: Optional[str] = None
    smtp_from_name: Optional[str] = None


class SmsSettingsUpdate(BaseModel):
    sms_enabled: bool
    sms_provider: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    msg91_auth_key: Optional[str] = None
    msg91_sender_id: Optional[str] = None
    msg91_template_id: Optional[str] = None


@router.get("/email")
def get_email_settings(db: Session = Depends(get_db), admin: dict = Depends(admin_required)):
    """Get email configuration settings"""
    settings = get_or_create_settings(db)
    configs = settings.configs or {}
    
    return {
        "email_enabled": settings.email_enabled == "true" if settings.email_enabled else False,
        "smtp_host": settings.smtp_host or "smtp.gmail.com",
        "smtp_port": settings.smtp_port or 587,
        "smtp_username": settings.smtp_user or "",
        "smtp_from_email": settings.smtp_user or "",
        "smtp_from_name": configs.get("smtp_from_name", "BharatBazaar"),
        "smtp_password_configured": bool(settings.smtp_password),
    }


@router.put("/email")
def update_email_settings(
    data: EmailSettingsUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(admin_required)
):
    """Update email configuration settings"""
    logger.info(f"Received email settings update: {data.dict()}")
    
    settings = get_or_create_settings(db)
    
    settings.email_enabled = "true" if data.email_enabled else "false"
    settings.smtp_host = data.smtp_host
    settings.smtp_port = data.smtp_port
    settings.smtp_user = data.smtp_user
    
    # Store from_name in configs JSON
    configs = dict(settings.configs or {})
    if data.smtp_from_name:
        configs["smtp_from_name"] = data.smtp_from_name
        logger.info(f"Updating smtp_from_name to: {data.smtp_from_name}")
    
    # Assign the dict directly - SQLAlchemy JSON type handles this
    settings.configs = configs
    logger.info(f"Updated configs: {configs}")
    
    # Only update password if provided
    if data.smtp_password:
        settings.smtp_password = data.smtp_password
    
    db.commit()
    db.refresh(settings)
    
    logger.info(f"Email settings updated by admin: {admin['name']}")
    
    return {
        "message": "Email settings updated successfully",
        "email_enabled": settings.email_enabled == "true"
    }


@router.get("/sms")
def get_sms_settings(db: Session = Depends(get_db), admin: dict = Depends(admin_required)):
    """Get SMS configuration settings"""
    settings = get_or_create_settings(db)
    
    return {
        "sms_enabled": settings.sms_enabled == "true" if settings.sms_enabled else False,
        "sms_provider": settings.sms_provider or "console",
        "twilio_account_sid": settings.twilio_account_sid or "",
        "twilio_auth_token": "***" if settings.twilio_auth_token else "",
        "twilio_phone_number": settings.twilio_phone_number or "",
        "msg91_auth_key": "***" if settings.msg91_auth_key else "",
        "msg91_sender_id": settings.msg91_sender_id or "",
        "msg91_template_id": settings.msg91_template_id or "",
        "twilio_configured": bool(settings.twilio_account_sid and settings.twilio_auth_token),
        "msg91_configured": bool(settings.msg91_auth_key),
    }


@router.put("/sms")
def update_sms_settings(
    data: SmsSettingsUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(admin_required)
):
    """Update SMS configuration settings"""
    settings = get_or_create_settings(db)
    
    settings.sms_enabled = "true" if data.sms_enabled else "false"
    settings.sms_provider = data.sms_provider
    
    # Update Twilio settings if provided
    if data.twilio_account_sid:
        settings.twilio_account_sid = data.twilio_account_sid
    if data.twilio_auth_token and data.twilio_auth_token != "***":
        settings.twilio_auth_token = data.twilio_auth_token
    if data.twilio_phone_number:
        settings.twilio_phone_number = data.twilio_phone_number
    
    # Update MSG91 settings if provided
    if data.msg91_auth_key and data.msg91_auth_key != "***":
        settings.msg91_auth_key = data.msg91_auth_key
    if data.msg91_sender_id:
        settings.msg91_sender_id = data.msg91_sender_id
    if data.msg91_template_id:
        settings.msg91_template_id = data.msg91_template_id
    
    db.commit()
    db.refresh(settings)
    
    logger.info(f"SMS settings updated by admin: {admin['name']}")
    
    return {
        "message": "SMS settings updated successfully",
        "sms_enabled": settings.sms_enabled == "true",
        "sms_provider": settings.sms_provider
    }


@router.post("/email/test")
def test_email(data: dict, db: Session = Depends(get_db), admin: dict = Depends(admin_required)):
    """Test email configuration by sending a test email"""
    from app.services.email_service import EmailService
    
    test_email = data.get("email")
    if not test_email:
        raise HTTPException(status_code=400, detail="Email address required")
    
    # Send test OTP email
    otp_sent = EmailService.send_otp_email(test_email, "1234567890", "123456")
    
    # Send test temporary password email
    temp_pw_sent = EmailService.send_temporary_password_email(
        test_email, 
        "Test User", 
        "TestPass123",
        is_registration=True
    )
    
    if otp_sent or temp_pw_sent:
        return {
            "message": "Test emails sent successfully",
            "note": "Check your inbox for OTP and temporary password test emails"
        }
    else:
        return {
            "message": "Test completed",
            "note": "Emails may be in console logs if EMAIL_ENABLED=false"
        }


# Public settings endpoint (no auth required)
@router.get("/public", include_in_schema=False)
def get_public_settings(db: Session = Depends(get_db)):
    """Get public settings (no authentication required)"""
    settings = get_or_create_settings(db)
    
    # SQLAlchemy already parses JSON fields, no need to json.loads() again
    address = settings.address or {}
    social_links = settings.social_links or {}
    configs = settings.configs or {}
    
    logger.info(f"Settings found - social_links: {social_links}, configs: {configs}")
    
    return {
        # Basic business info
        "business_name": settings.business_name or "BharatBazaar",
        "company_name": settings.company_name or "BharatBazaar Pvt Ltd",
        "gst_number": settings.gst_number or "",
        "phone": settings.phone or "",
        "email": settings.email or "",
        
        # Visual assets
        "logo_url": settings.logo_url or "",
        "favicon_url": settings.favicon_url or "",
        
        # Address
        "address": address,
        
        # Social media links (individual fields for easy access)
        "facebook_url": social_links.get("facebook_url", ""),
        "instagram_url": social_links.get("instagram_url", ""),
        "twitter_url": social_links.get("twitter_url", ""),
        "youtube_url": social_links.get("youtube_url", ""),
        "whatsapp_number": social_links.get("whatsapp_number", ""),
        
        # Payment & business configuration
        "upi_id": configs.get("upi_id", ""),
        "enable_gst_billing": configs.get("enable_gst_billing", True),
        "default_gst_rate": configs.get("default_gst_rate", 18.0),
        "invoice_prefix": configs.get("invoice_prefix", "INV"),
        "order_prefix": configs.get("order_prefix", "ORD"),
        
        # Full objects for backward compatibility
        "social_links": social_links,
        "configs": configs
    }
