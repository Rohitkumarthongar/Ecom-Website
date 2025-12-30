"""
Email service - wrapper around existing email_utils
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Email service for sending various types of emails"""
    
    @staticmethod
    def get_email_config():
        """Get email configuration from database or settings"""
        from app.core.database import SessionLocal
        from app import models
        
        # Try to get configuration from database first
        try:
            db = SessionLocal()
            db_settings = db.query(models.Settings).filter(models.Settings.type == "business").first()
            if db_settings and db_settings.smtp_user:
                config = {
                    "SMTP_HOST": db_settings.smtp_host or settings.SMTP_HOST or 'smtp.gmail.com',
                    "SMTP_PORT": db_settings.smtp_port or settings.SMTP_PORT or 587,
                    "SMTP_USERNAME": db_settings.smtp_user or settings.SMTP_USER or '',
                    "SMTP_PASSWORD": db_settings.smtp_password or settings.SMTP_PASSWORD or '',
                    "SMTP_FROM_EMAIL": db_settings.smtp_user or settings.SMTP_USER or 'support@bharatbazaar.com',
                    "SMTP_FROM_NAME": settings.EMAIL_FROM_NAME or 'BharatBazaar',
                    "EMAIL_ENABLED": db_settings.email_enabled == "true" if db_settings.email_enabled else settings.EMAIL_ENABLED
                }
                db.close()
                return config
            db.close()
        except Exception as e:
            logger.warning(f"Could not load email config from database: {e}")
        
        # Fall back to environment configuration
        return {
            "SMTP_HOST": settings.SMTP_HOST or 'smtp.gmail.com',
            "SMTP_PORT": settings.SMTP_PORT or 587,
            "SMTP_USERNAME": settings.SMTP_USER or 'support@bharatbazaar.com',
            "SMTP_PASSWORD": settings.SMTP_PASSWORD or '',
            "SMTP_FROM_EMAIL": settings.SMTP_USER or 'support@bharatbazaar.com',
            "SMTP_FROM_NAME": settings.EMAIL_FROM_NAME or 'BharatBazaar',
            "EMAIL_ENABLED": settings.EMAIL_ENABLED
        }

    @staticmethod
    def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """Send an email using SMTP"""
        config = EmailService.get_email_config()
        
        try:
            # Console logging for development/testing
            if not config["EMAIL_ENABLED"] or not config["SMTP_PASSWORD"]:
                print("=" * 60)
                print(f"FROM: {config['SMTP_FROM_EMAIL']}")
                print(f"TO: {to_email}")
                print(f"SUBJECT: {subject}")
                print("-" * 60)
                print(html_body if not text_body else text_body)
                print("=" * 60)
                logger.info(f"Email logged to console (EMAIL_ENABLED={config['EMAIL_ENABLED']})")
                return True
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{config['SMTP_FROM_NAME']} <{config['SMTP_FROM_EMAIL']}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text and HTML parts
            if text_body:
                part1 = MIMEText(text_body, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)
            
            # Send email via SMTP
            with smtplib.SMTP(config['SMTP_HOST'], config['SMTP_PORT']) as server:
                server.starttls()
                server.login(config['SMTP_USERNAME'], config['SMTP_PASSWORD'])
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            # Still log to console as fallback
            print("=" * 60)
            print(f"EMAIL SEND FAILED - Logging to console instead")
            print(f"FROM: {config['SMTP_FROM_EMAIL']}")
            print(f"TO: {to_email}")
            print(f"SUBJECT: {subject}")
            print("-" * 60)
            print(html_body if not text_body else text_body)
            print("=" * 60)
            return False

    @staticmethod
    def send_temporary_password_email(to_email: str, name: str, temporary_password: str, is_registration: bool = False) -> bool:
        """Send temporary password email for registration or password reset"""
        if is_registration:
            subject = "Welcome to BharatBazaar - Your Temporary Password"
            greeting = f"Welcome to BharatBazaar, {name}!"
            message = """
            <p>Your account has been created successfully. We've generated a temporary password for you.</p>
            <p><strong>Note:</strong> If you're having trouble with OTP verification, you can use this temporary password to log in directly.</p>
            """
        else:
            subject = "BharatBazaar - Password Reset"
            greeting = f"Hello {name},"
            message = """
            <p>You requested a password reset for your BharatBazaar account.</p>
            <p>We've generated a new temporary password for you.</p>
            """
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }}
                .password-box {{ background-color: #fff; border: 2px solid #4CAF50; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; }}
                .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
                .support {{ background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>BharatBazaar</h1>
                </div>
                <div class="content">
                    <h2>{greeting}</h2>
                    {message}
                    
                    <div class="password-box">
                        {temporary_password}
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> For security reasons, please change this password after logging in.
                    </div>
                    
                    <div class="support">
                        <h3>Need Help?</h3>
                        <p>If you're experiencing issues with OTP verification or have any questions, please contact our support team:</p>
                        <p><strong>Email:</strong> support@bharatbazaar.com</p>
                        <p>We're here to help you get started!</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email from BharatBazaar. Please do not reply to this email.</p>
                    <p>&copy; 2024 BharatBazaar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
{greeting}

{message.replace('<p>', '').replace('</p>', '').replace('<strong>', '').replace('</strong>', '')}

Your Temporary Password: {temporary_password}

IMPORTANT: For security reasons, please change this password after logging in.

Need Help?
If you're experiencing issues with OTP verification or have any questions, please contact our support team at support@bharatbazaar.com

---
This is an automated email from BharatBazaar. Please do not reply to this email.
© 2024 BharatBazaar. All rights reserved.
        """
        
        return EmailService.send_email(to_email, subject, html_body, text_body)

    @staticmethod
    def send_otp_email(to_email: str, phone: str, otp: str) -> bool:
        """Send OTP verification email with fallback instructions"""
        subject = "BharatBazaar - Your Verification Code"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }}
                .otp-box {{ background-color: #fff; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; }}
                .info {{ background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>BharatBazaar</h1>
                </div>
                <div class="content">
                    <h2>Your Verification Code</h2>
                    <p>Please use the following OTP to verify your phone number ({phone}):</p>
                    
                    <div class="otp-box">
                        {otp}
                    </div>
                    
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    
                    <div class="info">
                        <h3>OTP Not Working?</h3>
                        <p>If you're having trouble with OTP verification, you can:</p>
                        <ul>
                            <li>Request a temporary password during registration</li>
                            <li>Use the "Forgot Password" option to receive a temporary password via email</li>
                            <li>Contact our support team at <strong>support@bharatbazaar.com</strong></li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>If you didn't request this code, please ignore this email.</p>
                    <p>&copy; 2024 BharatBazaar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
BharatBazaar - Your Verification Code

Please use the following OTP to verify your phone number ({phone}):

{otp}

This code will expire in 10 minutes.

OTP Not Working?
If you're having trouble with OTP verification, you can:
- Request a temporary password during registration
- Use the "Forgot Password" option to receive a temporary password via email
- Contact our support team at support@bharatbazaar.com

---
If you didn't request this code, please ignore this email.
© 2024 BharatBazaar. All rights reserved.
        """
        
        return EmailService.send_email(to_email, subject, html_body, text_body)

    @staticmethod
    def send_order_cancelled_email(to_email: str, order_number: str, reason: str, refund_amount: float) -> bool:
        """Send order cancellation email"""
        subject = f"BharatBazaar - Order #{order_number} Cancelled"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f44336; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }}
                .details {{ background-color: #fff; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Order Cancelled</h1>
                </div>
                <div class="content">
                    <h2>Order #{order_number}</h2>
                    <p>Your order #{order_number} has been cancelled.</p>
                    
                    <div class="details">
                        <p><strong>Reason:</strong> {reason}</p>
                        <p><strong>Refund Amount:</strong> ₹{refund_amount}</p>
                        <p><strong>Refund Timeline:</strong> 3-5 business days to your original payment method.</p>
                    </div>
                    
                    <p>If you have any questions, please contact our support team at support@bharatbazaar.com</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 BharatBazaar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
BharatBazaar - Order #{order_number} Cancelled

Your order #{order_number} has been cancelled.

Reason: {reason}
Refund Amount: ₹{refund_amount}
Refund Timeline: 3-5 business days to your original payment method.

If you have any questions, please contact our support team at support@bharatbazaar.com

---
© 2024 BharatBazaar. All rights reserved.
        """
        
        return EmailService.send_email(to_email, subject, html_body, text_body)


# Backward compatibility functions
def send_otp_email(to_email: str, phone: str, otp: str) -> bool:
    """Backward compatibility wrapper"""
    return EmailService.send_otp_email(to_email, phone, otp)

def send_temporary_password_email(to_email: str, name: str, temporary_password: str, is_registration: bool = False) -> bool:
    """Backward compatibility wrapper"""
    return EmailService.send_temporary_password_email(to_email, name, temporary_password, is_registration)

def send_order_cancelled_email(to_email: str, order_number: str, reason: str, refund_amount: float) -> bool:
    """Backward compatibility wrapper"""
    return EmailService.send_order_cancelled_email(to_email, order_number, reason, refund_amount)