"""
Security utilities for authentication and authorization
"""
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from app import models

security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user_id: str, role: str) -> str:
    """Create JWT access token"""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[Dict[str, Any]]:
    """Optional authentication - returns None if no token provided"""
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return None
        
        payload = decode_token(token)
        user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
        if not user:
            return None
        
        # Convert to dict for backward compatibility
        user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
        user_dict.pop("password", None)
        if user.address is None: 
            user_dict["address"] = None
        if user.addresses is None: 
            user_dict["addresses"] = []
        return user_dict
    except:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    try:
        payload = decode_token(credentials.credentials)
        user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Convert to dict for backward compatibility
        user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
        user_dict.pop("password", None)
        if user.address is None: 
            user_dict["address"] = None
        if user.addresses is None: 
            user_dict["addresses"] = []
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

def admin_required(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require admin role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user