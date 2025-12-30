"""
Settings management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.security import admin_required
from app import models

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic schemas for settings
class EmailSettingsUpdate(BaseModel):
    email_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: Optional[str] = None


class SmsSettingsUpdate(BaseModel):
    sms_enabled: bool
    sms_provider: str  # console, twilio, msg91
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    msg91_auth_key: Optional[str] = None
    msg91_sender_id: Optional[str] = None
    msg91_template_id: Optional[str] = None


def get_or_create_settings(db: Session) -> models.Settings:
    """Get or create settings record"""
    settings = db.query(models.Settings).filter(models.Settings.type == "business").first()
    if not settings:
        settings = models.Settings(
            type="business",
            business_name="",
            company_name="",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/email")
def get_email_settings(db: Session = Depends(get_db), admin: dict = Depends(admin_required)):
    """Get email configuration settings"""
    settings = get_or_create_settings(db)
    
    return {
        "email_enabled": settings.email_enabled == "true" if settings.email_enabled else False,
        "smtp_host": settings.smtp_host or "smtp.gmail.com",
        "smtp_port": settings.smtp_port or 587,
        "smtp_username": settings.smtp_user or "",
        "smtp_from_email": settings.smtp_user or "",
        "smtp_from_name": "BharatBazaar",
        "smtp_password_configured": bool(settings.smtp_password),
    }


@router.put("/email")
def update_email_settings(
    data: EmailSettingsUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(admin_required)
):
    """Update email configuration settings"""
    settings = get_or_create_settings(db)
    
    settings.email_enabled = "true" if data.email_enabled else "false"
    settings.smtp_host = data.smtp_host
    settings.smtp_port = data.smtp_port
    settings.smtp_user = data.smtp_user
    
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
