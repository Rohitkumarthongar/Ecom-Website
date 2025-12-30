"""
SMS Service for sending OTPs
Supports Twilio and MSG91
"""
import logging
from typing import Optional
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """SMS service for sending OTP messages"""
    
    @staticmethod
    def get_sms_config():
        """Get SMS configuration from database or settings"""
        from app.core.database import SessionLocal
        from app import models
        
        # Try to get configuration from database first
        try:
            db = SessionLocal()
            db_settings = db.query(models.Settings).filter(models.Settings.type == "business").first()
            if db_settings:
                config = {
                    "SMS_ENABLED": db_settings.sms_enabled == "true" if db_settings.sms_enabled else settings.SMS_ENABLED,
                    "SMS_PROVIDER": db_settings.sms_provider or settings.SMS_PROVIDER or "console",
                    "TWILIO_ACCOUNT_SID": db_settings.twilio_account_sid or settings.TWILIO_ACCOUNT_SID,
                    "TWILIO_AUTH_TOKEN": db_settings.twilio_auth_token or settings.TWILIO_AUTH_TOKEN,
                    "TWILIO_PHONE_NUMBER": db_settings.twilio_phone_number or settings.TWILIO_PHONE_NUMBER,
                    "MSG91_AUTH_KEY": db_settings.msg91_auth_key or settings.MSG91_AUTH_KEY,
                    "MSG91_SENDER_ID": db_settings.msg91_sender_id or settings.MSG91_SENDER_ID,
                    "MSG91_TEMPLATE_ID": db_settings.msg91_template_id or settings.MSG91_TEMPLATE_ID,
                }
                db.close()
                return config
            db.close()
        except Exception as e:
            logger.warning(f"Could not load SMS config from database: {e}")
        
        # Fall back to environment configuration
        return {
            "SMS_ENABLED": settings.SMS_ENABLED,
            "SMS_PROVIDER": settings.SMS_PROVIDER or "console",
            "TWILIO_ACCOUNT_SID": settings.TWILIO_ACCOUNT_SID,
            "TWILIO_AUTH_TOKEN": settings.TWILIO_AUTH_TOKEN,
            "TWILIO_PHONE_NUMBER": settings.TWILIO_PHONE_NUMBER,
            "MSG91_AUTH_KEY": settings.MSG91_AUTH_KEY,
            "MSG91_SENDER_ID": settings.MSG91_SENDER_ID,
            "MSG91_TEMPLATE_ID": settings.MSG91_TEMPLATE_ID,
        }
    
    @staticmethod
    def send_sms_via_twilio(phone: str, message: str, config: dict = None) -> bool:
        """Send SMS using Twilio"""
        try:
            from twilio.rest import Client
            
            if config is None:
                config = SMSService.get_sms_config()
            
            if not config.get("TWILIO_ACCOUNT_SID") or not config.get("TWILIO_AUTH_TOKEN"):
                logger.warning("Twilio credentials not configured")
                return False
            
            client = Client(config["TWILIO_ACCOUNT_SID"], config["TWILIO_AUTH_TOKEN"])
            
            # Format phone number with country code if not present
            if not phone.startswith('+'):
                phone = f'+91{phone}'  # Default to India +91
            
            message_obj = client.messages.create(
                body=message,
                from_=config["TWILIO_PHONE_NUMBER"],
                to=phone
            )
            
            logger.info(f"SMS sent successfully via Twilio to {phone}. SID: {message_obj.sid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SMS via Twilio: {str(e)}")
            return False
    
    @staticmethod
    def send_sms_via_msg91(phone: str, message: str, template_id: Optional[str] = None, config: dict = None) -> bool:
        """Send SMS using MSG91 (Indian SMS provider)"""
        try:
            if config is None:
                config = SMSService.get_sms_config()
            
            if not config.get("MSG91_AUTH_KEY"):
                logger.warning("MSG91 auth key not configured")
                return False
            
            # Clean phone number (remove +91 if present)
            phone = phone.replace('+91', '').replace('+', '')
            
            url = "https://api.msg91.com/api/v5/flow/"
            
            payload = {
                "template_id": template_id or config.get("MSG91_TEMPLATE_ID"),
                "short_url": "0",
                "recipients": [
                    {
                        "mobiles": phone,
                        "message": message
                    }
                ]
            }
            
            headers = {
                "authkey": config["MSG91_AUTH_KEY"],
                "content-type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"SMS sent successfully via MSG91 to {phone}")
                return True
            else:
                logger.error(f"MSG91 API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send SMS via MSG91: {str(e)}")
            return False
    
    @staticmethod
    def send_otp_sms(phone: str, otp: str) -> bool:
        """Send OTP via SMS using configured provider (reads from database first)"""
        message = f"Your BharatBazaar verification code is: {otp}. This code will expire in 10 minutes. Do not share this code with anyone."
        
        # Get dynamic configuration
        config = SMSService.get_sms_config()
        
        # Check if SMS is enabled
        if not config.get("SMS_ENABLED"):
            print("=" * 60)
            print("SMS OTP (Console Mode - SMS_ENABLED=False)")
            print(f"TO: {phone}")
            print(f"MESSAGE: {message}")
            print("=" * 60)
            logger.info(f"SMS logged to console (SMS_ENABLED=False)")
            return True
        
        # Send via configured provider
        provider = config.get("SMS_PROVIDER", "console").lower()
        
        if provider == "twilio":
            return SMSService.send_sms_via_twilio(phone, message, config)
        elif provider == "msg91":
            return SMSService.send_sms_via_msg91(phone, message, config=config)
        else:
            # Console mode (default for testing)
            print("=" * 60)
            print(f"SMS OTP (Console Mode - Provider: {provider})")
            print(f"TO: {phone}")
            print(f"MESSAGE: {message}")
            print("=" * 60)
            logger.info(f"SMS logged to console (provider={provider})")
            return True


# Convenience function
def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via SMS"""
    return SMSService.send_otp_sms(phone, otp)
