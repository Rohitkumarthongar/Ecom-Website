"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.utils import generate_otp, generate_id
from app.schemas.auth import OTPRequest, OTPVerify, ForgotPasswordRequest, Token
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.services.email_service import EmailService
from app import models

router = APIRouter()

@router.post("/send-otp")
def send_otp(data: OTPRequest, db: Session = Depends(get_db)):
    """Send OTP to phone/email"""
    otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Upsert OTP
    existing_otp = db.query(models.OTP).filter(models.OTP.phone == data.phone).first()
    if existing_otp:
        existing_otp.otp = otp
        existing_otp.expiry = expiry
        existing_otp.verified = False
    else:
        new_otp = models.OTP(phone=data.phone, otp=otp, expiry=expiry, verified=False)
        db.add(new_otp)
    
    db.commit()
    
    # Send OTP via Email
    if data.email:
        EmailService.send_otp_email(data.email, data.phone, otp)
    
    return {"message": "OTP sent successfully", "otp_for_testing": otp}

@router.post("/verify-otp")
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP"""
    otp_doc = db.query(models.OTP).filter(models.OTP.phone == data.phone).first()
    if not otp_doc:
        raise HTTPException(status_code=400, detail="No OTP found for this phone")
    
    if otp_doc.otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.utcnow() > otp_doc.expiry: 
        raise HTTPException(status_code=400, detail="OTP expired")
    
    otp_doc.verified = True
    db.commit()
    return {"message": "OTP verified successfully", "verified": True}

@router.post("/register", response_model=dict)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    # Check if user exists
    existing = db.query(models.User).filter(models.User.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists with this phone number")
    
    if data.email:
        existing_email = db.query(models.User).filter(models.User.email == data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="User already exists with this email address")
    
    # Handle password
    if data.password:
        final_password = hash_password(data.password)
    else:
        # Generate temporary password
        temporary_password = f"Pass{generate_otp()}"
        final_password = hash_password(temporary_password)
        
        # Send temporary password via email
        if data.email:
            EmailService.send_temporary_password_email(
                to_email=data.email,
                name=data.name,
                temporary_password=temporary_password,
                is_registration=True
            )
    
    # Create user
    new_user = models.User(
        id=generate_id(),
        phone=data.phone,
        name=data.name,
        email=data.email,
        gst_number=data.gst_number,
        password=final_password,
        role="customer",
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create token
    token = create_access_token(new_user.id, "customer")
    
    # Convert user to dict
    user_dict = {c.name: getattr(new_user, c.name) for c in new_user.__table__.columns}
    user_dict.pop("password")
    
    return {"token": token, "user": user_dict}

@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    # Check by phone OR email
    user = db.query(models.User).filter(
        or_(
            models.User.phone == data.identifier,
            models.User.email == data.identifier
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user.id, user.role)
    
    user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
    user_dict.pop("password")
    
    return {"token": token, "user": user_dict}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Reset password"""
    identifier = data.email or data.phone
    if not identifier:
        raise HTTPException(status_code=400, detail="Please provide phone or email")
        
    user = db.query(models.User).filter(
        or_(
            models.User.email == identifier,
            models.User.phone == identifier
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.email:
        raise HTTPException(status_code=400, detail="No email address associated with this account")
    
    # Generate new temporary password
    new_password = f"Pass{generate_otp()}"
    user.password = hash_password(new_password)
    db.commit()
    
    # Send temporary password via email
    EmailService.send_temporary_password_email(
        to_email=user.email,
        name=user.name,
        temporary_password=new_password,
        is_registration=False
    )
    
    return {"message": f"New temporary password has been sent to {user.email}"}

@router.get("/me")
def get_current_user_info(user: dict = Depends(get_current_user)):
    """Get current user information"""
    return user

@router.get("/test")
def test_auth(user: dict = Depends(get_current_user)):
    """Test endpoint to check if authentication is working"""
    return {"message": "Authentication successful", "user": user["name"]}