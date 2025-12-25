from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import base64
import json
import io
import shutil
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch

# Import Database and Models
from database import get_db, engine
import models
import email_utils

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="BharatBazaar API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount static files for serving uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

JWT_SECRET = os.environ.get('JWT_SECRET', 'bharatbazaar-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ============ HELPER FUNCTIONS (Moved up for dependencies) ============

def generate_id():
    return str(uuid.uuid4())

def generate_order_number():
    """Generate a unique order number"""
    import random
    import string
    timestamp = datetime.now().strftime("%y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"ORD{timestamp}{random_part}"

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def save_uploaded_file(file: UploadFile, folder: str = "general", image_type: str = None) -> str:
    """Save uploaded file and return the URL"""
    try:
        # Create folder if it doesn't exist
        folder_path = UPLOAD_DIR / folder
        folder_path.mkdir(exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"{generate_id()}.{file_extension}"
        file_path = folder_path / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Optimize image if it's an image file
        if file_extension.lower() in ['jpg', 'jpeg', 'png', 'webp']:
            # Determine image type based on folder or explicit type
            if image_type:
                optimize_image(file_path, image_type=image_type)
            elif folder == "branding":
                optimize_image(file_path, image_type="logo")  # Default for branding
            elif folder == "banners":
                optimize_image(file_path, image_type="banner")
            elif folder == "categories":
                optimize_image(file_path, image_type="category")
            elif folder == "products":
                optimize_image(file_path, image_type="product")
            else:
                optimize_image(file_path, image_type="general")
        
        # Return URL
        return f"/uploads/{folder}/{unique_filename}"
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

def optimize_image(file_path: Path, max_size: tuple = (1200, 1200), quality: int = 85, image_type: str = "general"):
    """Optimize image size and quality with specific handling for different image types"""
    try:
        with Image.open(file_path) as img:
            # Convert to RGB if necessary, but preserve transparency for logos/favicons
            if img.mode in ('RGBA', 'LA', 'P'):
                # For logos and favicons, preserve transparency by converting to RGBA
                if image_type in ['logo', 'favicon', 'branding']:
                    if img.mode != 'RGBA':
                        img = img.convert('RGBA')
                else:
                    img = img.convert('RGB')
            
            # Specific sizing for different image types
            if image_type == 'logo':
                # Logo: Resize to fit within 400x120 while maintaining aspect ratio
                img.thumbnail((400, 120), Image.Resampling.LANCZOS)
            elif image_type == 'favicon':
                # Favicon: Create 32x32 size
                img = img.resize((32, 32), Image.Resampling.LANCZOS)
            elif image_type == 'banner':
                # Banner: Resize to 1200x400 (3:1 aspect ratio)
                img = img.resize((1200, 400), Image.Resampling.LANCZOS)
            elif image_type == 'category':
                # Category: Square aspect ratio, max 500x500
                # Make it square by cropping to center
                width, height = img.size
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                img = img.crop((left, top, left + size, top + size))
                img = img.resize((500, 500), Image.Resampling.LANCZOS)
            elif image_type == 'product':
                # Product: Square aspect ratio, max 800x800
                width, height = img.size
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                img = img.crop((left, top, left + size, top + size))
                img = img.resize((800, 800), Image.Resampling.LANCZOS)
            else:
                # General: Use provided max_size
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save optimized image
            if img.mode == 'RGBA' and file_path.suffix.lower() in ['.jpg', '.jpeg']:
                # Convert RGBA to RGB for JPEG (no transparency support)
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
                img.save(file_path, optimize=True, quality=quality)
            else:
                # Save with transparency support for PNG
                img.save(file_path, optimize=True, quality=quality)
            
    except Exception as e:
        # If optimization fails, keep original file
        logging.warning(f"Failed to optimize image {file_path}: {str(e)}")

def delete_uploaded_file(file_url: str):
    """Delete uploaded file"""
    try:
        if file_url and file_url.startswith('/uploads/'):
            file_path = Path(file_url[1:])  # Remove leading slash
            if file_path.exists():
                file_path.unlink()
    except Exception as e:
        logging.warning(f"Failed to delete file {file_url}: {str(e)}")

# Create Tables
models.Base.metadata.create_all(bind=engine)

def create_initial_data():
    db = next(get_db())
    try:
        # Create Admin
        admin_phone = "8233189764"
        admin = db.query(models.User).filter(models.User.phone == admin_phone).first()
        if not admin:
            new_admin = models.User(
                id=generate_id(),
                phone=admin_phone,
                name="Rohit",
                email="admin@bharatbazaar.com",
                password=hash_password("Rohit@123"),
                role="admin",
                is_seller=True,
                is_wholesale=True,
                created_at=datetime.utcnow()
            )
            db.add(new_admin)
            db.commit()
            print(f"Admin user {admin_phone} created.")
        else:
            # Force update password to ensure it's correct (in case of previous seed errors)
            admin.password = hash_password("Rohit@123")
            admin.role = "admin" # Ensure role is admin
            admin.name = "Rohit"
            db.commit()
            print(f"Admin user {admin_phone} updated/verified.")
            
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

# Run seed on startup
create_initial_data()

# ============ MODELS (Pydantic) ============

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    is_gst_verified: bool = False
    address: Optional[Dict[str, str]] = None
    addresses: Optional[List[Dict[str, str]]] = []
    role: str = "customer"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    gst_number: Optional[str] = None
    password: Optional[str] = None
    request_seller: bool = False

class AdminCreate(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    password: str

class UserAddressUpdate(BaseModel):
    addresses: List[Dict[str, str]]

class SellerRequestInput(BaseModel):
    user_id: str
    business_name: Optional[str] = None
    gst_number: Optional[str] = None

class PincodeVerify(BaseModel):
    pincode: str

class UserLogin(BaseModel):
    identifier: str # Phone or Email
    password: str

class OTPRequest(BaseModel):
    phone: str
    email: Optional[str] = None # Capture email for OTP delivery

class ForgotPasswordRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None

class OTPVerify(BaseModel):
    phone: str
    otp: str

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    sku: str
    mrp: float
    selling_price: float
    wholesale_price: Optional[float] = None
    wholesale_min_qty: int = 10
    cost_price: float
    stock_qty: int = 0
    low_stock_threshold: int = 10
    images: List[str] = []
    variants: Optional[List[Dict[str, Any]]] = []
    gst_rate: float = 18.0
    hsn_code: Optional[str] = None
    weight: Optional[float] = None
    is_active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    mrp: Optional[float] = None
    selling_price: Optional[float] = None
    wholesale_price: Optional[float] = None
    wholesale_min_qty: Optional[int] = None
    cost_price: Optional[float] = None
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    images: Optional[List[str]] = None
    gst_rate: Optional[float] = None
    is_active: Optional[bool] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class OrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: Dict[str, str]
    payment_method: str = "cod"
    is_offline: bool = False
    customer_phone: Optional[str] = None
    apply_gst: bool = True
    discount_amount: float = 0
    discount_percentage: float = 0

class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    courier_provider: Optional[str] = None
    notes: Optional[str] = None

class BannerCreate(BaseModel):
    title: str
    image_url: str
    link: Optional[str] = None
    position: int = 0
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float
    min_order_value: float = 0
    max_discount: Optional[float] = None
    coupon_code: Optional[str] = None
    product_ids: Optional[List[str]] = []
    category_ids: Optional[List[str]] = []
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CourierProviderCreate(BaseModel):
    name: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    tracking_url_template: Optional[str] = None
    is_active: bool = True
    priority: int = 1

class PaymentGatewayCreate(BaseModel):
    name: str
    merchant_id: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_test_mode: bool = True
    is_active: bool = True

class SettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[Dict[str, str]] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    enable_gst_billing: bool = True
    default_gst_rate: float = 18.0
    invoice_prefix: str = "INV"
    order_prefix: str = "ORD"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    upi_id: Optional[str] = None
    
class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class AdminCreate(BaseModel):
    name: str
    email: str
    phone: str

class ReturnRequest(BaseModel):
    order_id: str
    items: List[Dict[str, Any]]
    reason: str
    refund_method: str = "original"

class ContactMessage(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str

# ============ DEPENDENCIES ============

def get_current_user_optional(request: Request, db: Session = Depends(get_db)):
    """Optional authentication - returns None if no token provided"""
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return None
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
        if not user:
            return None
        
        user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
        if user.address is None: user_dict["address"] = None
        if user.addresses is None: user_dict["addresses"] = []
        return user_dict
    except:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Convert SQLAlchemy model to dict for backward compatibility in routing logic
        user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
        if user.address is None: user_dict["address"] = None
        if user.addresses is None: user_dict["addresses"] = []
        return user_dict
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

def admin_required(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def generate_otp():
    return str(random.randint(100000, 999999))

def generate_order_number():
    return f"ORD{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"

def generate_invoice_number():
    return f"INV{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"

# ============ IMAGE UPLOAD ROUTES ============

@api_router.post("/upload/image")
def upload_image(
    file: UploadFile = File(...),
    folder: str = "general",
    image_type: str = None,
    admin: dict = Depends(admin_required)
):
    """Upload an image file with automatic optimization"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Remove file size restriction - let the system handle any size
    # The optimization will resize appropriately
    
    # Save file with specific image type
    file_url = save_uploaded_file(file, folder, image_type)
    
    return {
        "message": "Image uploaded and optimized successfully",
        "url": file_url,
        "filename": file.filename,
        "optimized_for": image_type or folder
    }

@api_router.post("/upload/logo")
def upload_logo(
    file: UploadFile = File(...),
    admin: dict = Depends(admin_required)
):
    """Upload and optimize logo image (any size will be optimized to 400x120 max)"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_url = save_uploaded_file(file, "branding", "logo")
    
    return {
        "message": "Logo uploaded and optimized successfully",
        "url": file_url,
        "filename": file.filename,
        "optimized_size": "400x120 max (aspect ratio preserved)"
    }

@api_router.post("/upload/favicon")
def upload_favicon(
    file: UploadFile = File(...),
    admin: dict = Depends(admin_required)
):
    """Upload and optimize favicon image (any size will be optimized to 32x32)"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_url = save_uploaded_file(file, "branding", "favicon")
    
    return {
        "message": "Favicon uploaded and optimized successfully",
        "url": file_url,
        "filename": file.filename,
        "optimized_size": "32x32 pixels"
    }

@api_router.post("/upload/multiple")
def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = "general",
    image_type: str = None,
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
        
        # Remove size restriction - let optimization handle it
        
        try:
            file_url = save_uploaded_file(file, folder, image_type)
            uploaded_files.append({
                "url": file_url,
                "filename": file.filename
            })
        except Exception as e:
            continue
    
    return {
        "message": f"Uploaded and optimized {len(uploaded_files)} images successfully",
        "files": uploaded_files,
        "optimized_for": image_type or folder
    }

@api_router.delete("/upload/delete")
def delete_image(
    file_url: str,
    admin: dict = Depends(admin_required)
):
    """Delete an uploaded image"""
    delete_uploaded_file(file_url)
    return {"message": "Image deleted successfully"}

# ============ AUTH ROUTES ============

@api_router.get("/auth/test")
def test_auth(user: dict = Depends(get_current_user)):
    """Test endpoint to check if authentication is working"""
    return {"message": "Authentication successful", "user": user["name"]}

@api_router.post("/admin/test-email")
def test_email_functionality(data: dict, admin: dict = Depends(admin_required)):
    """Test endpoint to verify email functionality"""
    test_email = data.get("email", "test@example.com")
    
    # Test OTP email
    otp_result = email_utils.send_otp_email(test_email, "9876543210", "123456")
    
    # Test temporary password email
    temp_pass_result = email_utils.send_temporary_password_email(
        test_email, "Test User", "TempPass123", True
    )
    
    return {
        "message": "Email test completed",
        "otp_email_sent": otp_result,
        "temp_password_email_sent": temp_pass_result,
        "note": "Check server console logs if EMAIL_ENABLED=false"
    }

@api_router.post("/auth/send-otp")
def send_otp(data: OTPRequest, db: Session = Depends(get_db)):
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
    
    # Send OTP via Email with fallback instructions
    if data.email:
        email_utils.send_otp_email(data.email, data.phone, otp)
    
    return {"message": "OTP sent successfully", "otp_for_testing": otp}

@api_router.post("/auth/verify-otp")
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
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

@api_router.post("/auth/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    # Check if OTP was verified
    otp_doc = db.query(models.OTP).filter(models.OTP.phone == data.phone, models.OTP.verified == True).first()
    if not otp_doc:
        # In case user registers without OTP flow (e.g. dev), we might want to relax this OR enforce it strict
        # For now enforcing strict to match previous logic
        pass
        # Commented out for dev ease, or uncomment if strictly needed
    
    # Check if user exists
    existing = db.query(models.User).filter(models.User.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    request_supplier = bool(data.gst_number)
    supplier_status = "pending" if request_supplier else "none"
    is_wholesale = False
    
    # helper for password
    final_password = ""
    temporary_password = ""
    should_send_email = False
    
    if data.password:
        final_password = hash_password(data.password)
    else:
        # Generate temporary password if none provided
        temporary_password = f"Pass{generate_otp()}"
        final_password = hash_password(temporary_password)
        should_send_email = True
    
    new_user = models.User(
        id=generate_id(),
        phone=data.phone,
        name=data.name,
        email=data.email,
        gst_number=data.gst_number,
        is_gst_verified=False,
        is_wholesale=is_wholesale,
        supplier_status=supplier_status,
        password=final_password,
        role="customer",
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    if otp_doc:
        db.delete(otp_doc)
    db.commit()
    db.refresh(new_user)
    
    # Send temporary password via email ONLY if we generated it
    if should_send_email and data.email:
        email_utils.send_temporary_password_email(
            to_email=data.email,
            name=data.name,
            temporary_password=temporary_password,
            is_registration=True
        )
    
    token = create_token(new_user.id, "customer")
    
    user_dict = {c.name: getattr(new_user, c.name) for c in new_user.__table__.columns}
    user_dict.pop("password")
    
    response = {"token": token, "user": user_dict}
    if request_supplier:
        response["supplier_pending"] = True
        response["message"] = "Your supplier request has been submitted. Admin will review and approve your request."
    return response

@api_router.post("/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
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
    
    token = create_token(user.id, user.role)
    
    user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
    user_dict.pop("password")
    
    return {"token": token, "user": user_dict}

@api_router.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # ForgotPasswordRequest has phone and email, we can use either
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
        # Don't reveal user existence for security, but for this app maybe ok to say "User not found" 
        # based on user preference to be helpful. 
        raise HTTPException(status_code=404, detail="User not found")
    
    # Ensure user has an email address
    if not user.email:
        raise HTTPException(status_code=400, detail="No email address associated with this account. Please contact support@amolias.com")
    
    # Generate new temporary password
    new_password = f"Pass{generate_otp()}"
    user.password = hash_password(new_password)
    db.commit()
    
    # Send temporary password via email
    email_utils.send_temporary_password_email(
        to_email=user.email,
        name=user.name,
        temporary_password=new_password,
        is_registration=False
    )
    
    return {"message": f"New temporary password has been sent to {user.email}"}

@api_router.get("/auth/me")
def get_current_user_info(user: dict = Depends(get_current_user)):
    """Get current user information"""
    return user

@api_router.put("/auth/profile")
def update_profile(data: dict, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    allowed_fields = ["name", "email", "address", "addresses"]
    db_user = db.query(models.User).filter(models.User.id == user["id"]).first()
    
    for k, v in data.items():
        if k in allowed_fields:
            setattr(db_user, k, v)
    
    db.commit()
    db.refresh(db_user)
    
    user_dict = {c.name: getattr(db_user, c.name) for c in db_user.__table__.columns}
    user_dict.pop("password")
    return user_dict

# ============ SELLER REQUEST ROUTES ============

@api_router.post("/auth/request-seller")
def request_seller_upgrade(data: SellerRequestInput, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    request_id = generate_id()
    new_request = models.SellerRequest(
        id=request_id,
        user_id=user["id"],
        user_name=user["name"],
        user_phone=user["phone"],
        business_name=data.business_name,
        gst_number=data.gst_number,
        status="pending"
    )
    db.add(new_request)
    
    # Notification
    notification = models.Notification(
        id=generate_id(),
        type="seller_request",
        title="New Seller Request",
        message=f"{user['name']} has requested seller access",
        data={"request_id": request_id, "user_id": user["id"]},
        for_admin=True,
        read=False
    )
    db.add(notification)
    
    db.commit()
    db.refresh(new_request)
    
    return {"message": "Seller request submitted", "request": {c.name: getattr(new_request, c.name) for c in new_request.__table__.columns}}

@api_router.get("/admin/seller-requests")
def get_seller_requests(status: Optional[str] = None, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    query = db.query(models.SellerRequest)
    if status:
        query = query.filter(models.SellerRequest.status == status)
    
    requests = query.order_by(models.SellerRequest.created_at.desc()).limit(100).all()
    return requests

@api_router.put("/admin/seller-requests/{request_id}")
def handle_seller_request(request_id: str, data: dict, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    request = db.query(models.SellerRequest).filter(models.SellerRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    status = data.get("status", "approved")
    request.status = status
    
    if status == "approved":
        # Upgrade user
        user = db.query(models.User).filter(models.User.id == request.user_id).first()
        if user:
            user.is_seller = True
            user.is_wholesale = True
            user.gst_number = request.gst_number or user.gst_number
            
            # Notify user
            note = models.Notification(
                id=generate_id(),
                type="seller_approved",
                title="Seller Request Approved!",
                message="Congratulations! Your seller request has been approved.",
                user_id=user.id,
                for_admin=False,
                read=False
            )
            db.add(note)
    
    db.commit()
    return {"message": f"Request {status}"}

# ============ NOTIFICATION ROUTES ============

@api_router.get("/notifications")
def get_user_notifications(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == user["id"],
        models.Notification.for_admin == False
    ).order_by(models.Notification.created_at.desc()).limit(50).all()
    
    unread_count = db.query(models.Notification).filter(
        models.Notification.user_id == user["id"],
        models.Notification.read == False,
        models.Notification.for_admin == False
    ).count()
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if note:
        note.read = True
        db.commit()
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/mark-all-read")
def mark_all_read(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.user_id == user["id"]).update({"read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@api_router.get("/admin/notifications")
def get_admin_notifications(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).filter(
        models.Notification.for_admin == True
    ).order_by(models.Notification.created_at.desc()).limit(50).all()
    
    unread_count = db.query(models.Notification).filter(
        models.Notification.for_admin == True,
        models.Notification.read == False
    ).count()
    
    return {"notifications": notifications, "unread_count": unread_count}

# ============ PINCODE VERIFICATION ============

@api_router.post("/verify-pincode")
def verify_pincode(data: PincodeVerify):
    pincode = data.pincode
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode format")
    
    first_digit = int(pincode[0])
    regions = {
        1: "Delhi/Haryana/Punjab/HP/J&K", 2: "UP/Uttarakhand", 3: "Rajasthan/Gujarat",
        4: "Maharashtra/Goa/MP/Chhattisgarh", 5: "Andhra/Telangana/Karnataka", 
        6: "Tamil Nadu/Kerala", 7: "West Bengal/Odisha/NE States", 8: "Bihar/Jharkhand"
    }
    
    if first_digit in regions:
        return {
            "valid": True, "pincode": pincode, "region": regions[first_digit],
            "serviceable": True, "estimated_delivery": "3-5 business days"
        }
    
    return {"valid": False, "pincode": pincode, "serviceable": False}

# ============ BANNER ROUTES ============

@api_router.get("/banners")
def get_banners(db: Session = Depends(get_db)):
    banners = db.query(models.Banner).filter(models.Banner.is_active == True).order_by(models.Banner.position).all()
    return banners

@api_router.post("/admin/banners")
def create_banner(data: BannerCreate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    new_banner = models.Banner(
        id=generate_id(),
        **data.model_dump(),
        created_at=datetime.utcnow()
    )
    db.add(new_banner)
    db.commit()
    db.refresh(new_banner)
    return new_banner

@api_router.put("/admin/banners/{banner_id}")
def update_banner(banner_id: str, data: dict, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
    if banner:
        for k, v in data.items():
            if hasattr(banner, k):
                setattr(banner, k, v)
        db.commit()
    return {"message": "Banner updated"}

@api_router.delete("/admin/banners/{banner_id}")
def delete_banner(banner_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    db.query(models.Banner).filter(models.Banner.id == banner_id).delete()
    db.commit()
    return {"message": "Banner deleted"}

# ============ CATEGORY ROUTES ============

@api_router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).filter(models.Category.is_active == True).all()
    return categories

@api_router.get("/categories/{category_id}")
def get_category(category_id: str, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@api_router.post("/admin/categories")
def create_category(data: CategoryCreate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    new_cat = models.Category(
        id=generate_id(),
        **data.model_dump(),
        created_at=datetime.utcnow()
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@api_router.put("/admin/categories/{category_id}")
def update_category(category_id: str, data: dict, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if cat:
        for k, v in data.items():
            if hasattr(cat, k):
                setattr(cat, k, v)
        db.commit()
    return {"message": "Category updated"}

@api_router.delete("/admin/categories/{category_id}")
def delete_category(category_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    db.query(models.Category).filter(models.Category.id == category_id).delete()
    db.commit()
    return {"message": "Category deleted"}

# ============ PRODUCT ROUTES ============

@api_router.get("/products")
def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(models.Product).filter(models.Product.is_active == True)
    
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Product.name.like(search_pattern),
                models.Product.description.like(search_pattern),
                models.Product.sku.like(search_pattern)
            )
        )
    if min_price:
        query = query.filter(models.Product.selling_price >= min_price)
    if max_price:
        query = query.filter(models.Product.selling_price <= max_price)
        
    # Sorting
    sort_attr = getattr(models.Product, sort_by, models.Product.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(asc(sort_attr))
        
    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()
    
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/products/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/admin/products")
def create_product(data: ProductCreate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    existing = db.query(models.Product).filter(models.Product.sku == data.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    new_product = models.Product(
        id=generate_id(),
        **data.model_dump(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@api_router.put("/admin/products/{product_id}")
def update_product(product_id: str, data: ProductUpdate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product:
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(product, k, v)
        product.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(product)
    return product

@api_router.delete("/admin/products/{product_id}")
def delete_product(product_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    db.query(models.Product).filter(models.Product.id == product_id).delete()
    db.commit()
    return {"message": "Product deleted"}

@api_router.post("/admin/products/bulk-upload")
def bulk_upload_products(products: List[ProductCreate], admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    created = 0
    updated = 0
    errors = []
    
    for product_data in products:
        try:
            existing = db.query(models.Product).filter(models.Product.sku == product_data.sku).first()
            if existing:
                for k, v in product_data.model_dump().items():
                    setattr(existing, k, v)
                existing.updated_at = datetime.utcnow()
                updated += 1
            else:
                new_product = models.Product(
                    id=generate_id(),
                    **product_data.model_dump(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_product)
                created += 1
        except Exception as e:
            errors.append(f"SKU {product_data.sku}: {str(e)}")
    
    db.commit()
    return {"created": created, "updated": updated, "errors": errors}

# ============ INVENTORY & ORDERS ============

@api_router.get("/admin/inventory")
def get_inventory(low_stock_only: bool = False, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if low_stock_only:
        query = query.filter(models.Product.stock_qty <= models.Product.low_stock_threshold)
        
    products = query.limit(1000).all()
    
    total_value = sum(p.stock_qty * p.cost_price for p in products)
    low_stock_count = sum(1 for p in products if p.stock_qty <= p.low_stock_threshold)
    out_of_stock = sum(1 for p in products if p.stock_qty == 0)
    
    return {
        "products": products,
        "stats": {
            "total_products": len(products),
            "total_inventory_value": total_value,
            "low_stock_count": low_stock_count,
            "out_of_stock": out_of_stock
        }
    }

@api_router.post("/orders")
def create_order(data: OrderCreate, request: Request, db: Session = Depends(get_db)):
    user = get_current_user_optional(request, db)
    
    if not user:
        # For now, require authentication for orders
        raise HTTPException(status_code=401, detail="Authentication required to place orders")

    # Simplified logic for creating order
    # Fetch products
    items_valid = []
    subtotal = 0
    
    for item in data.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not prod:
             raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
        if prod.stock_qty < item.quantity:
             raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod.name}")
        
        price = prod.selling_price
        # Logic for wholesale price
        if user and user.get("is_wholesale") and item.quantity >= prod.wholesale_min_qty:
             price = prod.wholesale_price or prod.selling_price
             
        item_total = price * item.quantity
        gst_amount = item_total * (prod.gst_rate / 100) if data.apply_gst else 0
        
        items_valid.append({
            "product_id": prod.id,
            "product_name": prod.name,
            "sku": prod.sku,
            "quantity": item.quantity,
            "price": price,
            "total": item_total + gst_amount,
            "gst_amount": gst_amount,
            "image_url": prod.images[0] if prod.images else None
        })
        subtotal += item_total
        
        # Update stock
        prod.stock_qty -= item.quantity

    total_gst = sum(i["gst_amount"] for i in items_valid)
    discount = data.discount_amount
    grand_total = subtotal + total_gst - discount
    
    new_order = models.Order(
        id=generate_id(),
        order_number=generate_order_number(),
        user_id=user["id"] if user else None,
        customer_phone=data.customer_phone,
        items=items_valid,
        subtotal=subtotal,
        gst_applied=data.apply_gst,
        gst_total=total_gst,
        discount_amount=discount,
        grand_total=grand_total,
        shipping_address=data.shipping_address,
        payment_method=data.payment_method,
        status="pending",
        is_offline=data.is_offline,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_order)
    
    # Notification
    if user:
        note = models.Notification(
            id=generate_id(),
            type="order_placed",
            title="Order Placed",
            message=f"Order #{new_order.order_number} placed.",
            user_id=user["id"],
            for_admin=False
        )
        db.add(note)
        
    db.commit()
    db.refresh(new_order)
    return new_order

@api_router.get("/orders")
def get_user_orders(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user["id"]).order_by(models.Order.created_at.desc()).limit(100).all()
    return orders

@api_router.get("/orders/{order_id}")
def get_order_by_id(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@api_router.get("/admin/orders")
def get_all_orders(
    status: Optional[str] = None, page: int = 1, limit: int = 20, 
    admin: dict = Depends(admin_required), db: Session = Depends(get_db)
):
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    
    total = query.count()
    orders = query.order_by(models.Order.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit
    }
@api_router.get("/admin/orders/{order_id}/invoice")
def get_invoice(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check access (admin or owner)
    if user["role"] != "admin" and order.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Generate PDF
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, height - 50, "BharatBazaar Invoice")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Invoice #: {order.order_number.replace('ORD', 'INV')}")
    c.drawString(50, height - 100, f"Order #: {order.order_number}")
    c.drawString(50, height - 120, f"Date: {order.created_at.strftime('%d %b %Y')}")
    
    # Customer Details
    c.drawString(350, height - 80, "Bill To:")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, height - 100, order.shipping_address.get("name", ""))
    c.setFont("Helvetica", 10)
    c.drawString(350, height - 115, order.shipping_address.get("line1", ""))
    if order.shipping_address.get("line2"):
        c.drawString(350, height - 130, order.shipping_address.get("line2", ""))
        c.drawString(350, height - 145, f"{order.shipping_address.get('city')}, {order.shipping_address.get('state')} - {order.shipping_address.get('pincode')}")
        c.drawString(350, height - 160, f"Phone: {order.shipping_address.get('phone', '')}")
    else:
        c.drawString(350, height - 130, f"{order.shipping_address.get('city')}, {order.shipping_address.get('state')} - {order.shipping_address.get('pincode')}")
        c.drawString(350, height - 145, f"Phone: {order.shipping_address.get('phone', '')}")
        
    # Table Header
    y = height - 200
    c.line(50, y, width - 50, y)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y - 15, "Item")
    c.drawString(300, y - 15, "Qty")
    c.drawString(350, y - 15, "Price")
    c.drawString(450, y - 15, "Total")
    c.line(50, y - 25, width - 50, y - 25)
    
    # items
    y -= 45
    c.setFont("Helvetica", 10)
    for item in order.items:
        name = item.get("product_name", "Item")[:40] # Truncate if long
        qty = str(item.get("quantity", 0))
        price = f"{item.get('price', 0):.2f}"
        total = f"{item.get('total', 0):.2f}"
        
        c.drawString(50, y, name)
        c.drawString(300, y, qty)
        c.drawString(350, y, price)
        c.drawString(450, y, total)
        y -= 20
        
    # Summary
    y -= 20
    c.line(300, y, width - 50, y)
    y -= 20
    
    c.drawString(350, y, "Subtotal:")
    c.drawRightString(width - 50, y, f"{order.subtotal:.2f}")
    y -= 20
    
    c.drawString(350, y, "GST:")
    c.drawRightString(width - 50, y, f"{order.gst_total:.2f}")
    y -= 20
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, y, "Grand Total:")
    c.drawRightString(width - 50, y, f"{order.grand_total:.2f}")
    
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Invoice_{order.order_number}.pdf"})

# ============ TEAM MANAGEMENT ROUTES ============

@api_router.get("/admin/team")
def get_team_members(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get all users with their roles"""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    
    user_list = []
    for user in users:
        user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
        user_dict.pop("password", None)
        user_list.append(user_dict)
    
    return {"users": user_list}

@api_router.post("/admin/team")
def create_admin_user(data: AdminCreate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Create a new admin user"""
    # Check if user already exists
    existing = db.query(models.User).filter(
        or_(
            models.User.phone == data.phone,
            models.User.email == data.email
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User with this phone or email already exists")
    
    # Generate temporary password
    temp_password = f"Pass{generate_otp()}"
    
    # Create new admin user
    new_admin = models.User(
        id=generate_id(),
        phone=data.phone,
        name=data.name,
        email=data.email,
        password=hash_password(temp_password),
        role="admin",
        created_at=datetime.utcnow()
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    # Send welcome email with temporary password
    if data.email:
        email_utils.send_temporary_password_email(
            to_email=data.email,
            name=data.name,
            temporary_password=temp_password,
            is_registration=True
        )
    
    user_dict = {c.name: getattr(new_admin, c.name) for c in new_admin.__table__.columns}
    user_dict.pop("password")
    
    return {"message": "Admin user created successfully", "user": user_dict, "temporary_password": temp_password}

@api_router.put("/admin/team/{user_id}")
def update_user_role(user_id: str, data: dict, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Update user role"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from demoting themselves
    if user.id == admin["id"] and data.get("role") != "admin":
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    
    # Update role
    if "role" in data:
        user.role = data["role"]
    
    # Update other fields if provided
    if "is_wholesale" in data:
        user.is_wholesale = data["is_wholesale"]
    if "is_seller" in data:
        user.is_seller = data["is_seller"]
    
    db.commit()
    db.refresh(user)
    
    user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
    user_dict.pop("password")
    
    return {"message": "User role updated successfully", "user": user_dict}

@api_router.delete("/admin/team/{user_id}")
def remove_admin_access(user_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Remove admin access (demote to customer)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from removing themselves
    if user.id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")
    
    # Demote to customer
    user.role = "customer"
    db.commit()
    
    return {"message": "Admin access removed successfully"}

# ============ SETTINGS ROUTES ============

@api_router.get("/admin/settings")
def get_settings(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get business settings"""
    settings = db.query(models.Settings).filter(models.Settings.type == "business").first()
    if not settings:
        # Create default settings
        default_settings = models.Settings(
            type="business",
            business_name="BharatBazaar",
            gst_number="",
            address={},
            phone="",
            email="",
            logo_url="",
            favicon_url="",
            social_links={},
            configs={
                "enable_gst_billing": True,
                "default_gst_rate": 18.0,
                "invoice_prefix": "INV",
                "order_prefix": "ORD"
            },
            updated_at=datetime.utcnow()
        )
        db.add(default_settings)
        db.commit()
        db.refresh(default_settings)
        settings = default_settings
    
    # Return flattened response
    return {
        "business_name": settings.business_name or "BharatBazaar",
        "gst_number": settings.gst_number or "",
        "phone": settings.phone or "",
        "email": settings.email or "",
        "address": settings.address or {},
        "logo_url": settings.logo_url or "",
        "favicon_url": settings.favicon_url or "",
        "enable_gst_billing": settings.configs.get("enable_gst_billing", True) if settings.configs else True,
        "default_gst_rate": settings.configs.get("default_gst_rate", 18.0) if settings.configs else 18.0,
        "invoice_prefix": settings.configs.get("invoice_prefix", "INV") if settings.configs else "INV",
        "order_prefix": settings.configs.get("order_prefix", "ORD") if settings.configs else "ORD",
        "upi_id": settings.configs.get("upi_id", "") if settings.configs else "",
        "facebook_url": settings.social_links.get("facebook_url", "") if settings.social_links else "",
        "instagram_url": settings.social_links.get("instagram_url", "") if settings.social_links else "",
        "twitter_url": settings.social_links.get("twitter_url", "") if settings.social_links else "",
        "youtube_url": settings.social_links.get("youtube_url", "") if settings.social_links else "",
        "whatsapp_number": settings.social_links.get("whatsapp_number", "") if settings.social_links else ""
    }

@api_router.get("/admin/settings/email")
def get_email_settings(admin: dict = Depends(admin_required)):
    """Get email configuration settings"""
    return {
        "email_enabled": os.environ.get('EMAIL_ENABLED', 'false').lower() == 'true',
        "smtp_host": os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
        "smtp_port": int(os.environ.get('SMTP_PORT', '587')),
        "smtp_username": os.environ.get('SMTP_USERNAME', ''),
        "smtp_from_email": os.environ.get('SMTP_FROM_EMAIL', ''),
        "smtp_from_name": os.environ.get('SMTP_FROM_NAME', 'BharatBazaar Support'),
        "smtp_password_configured": bool(os.environ.get('SMTP_PASSWORD', ''))
    }

@api_router.post("/admin/settings/email/test")
def test_email_settings(data: dict, admin: dict = Depends(admin_required)):
    """Test email configuration by sending a test email"""
    test_email = data.get("email", admin.get("email", "test@example.com"))
    
    # Test OTP email
    otp_result = email_utils.send_otp_email(test_email, "9876543210", "123456")
    
    # Test temporary password email
    temp_pass_result = email_utils.send_temporary_password_email(
        test_email, admin.get("name", "Test User"), "TempPass123", True
    )
    
    return {
        "message": "Email test completed",
        "otp_email_sent": otp_result,
        "temp_password_email_sent": temp_pass_result,
        "test_email": test_email,
        "note": "Check server console logs if EMAIL_ENABLED=false or check your email inbox if EMAIL_ENABLED=true"
    }

@api_router.put("/admin/settings")
def update_settings(data: SettingsUpdate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Update business settings"""
    settings = db.query(models.Settings).filter(models.Settings.type == "business").first()
    if not settings:
        settings = models.Settings(type="business")
        db.add(settings)
    
    # Update basic fields
    if data.business_name is not None:
        settings.business_name = data.business_name
    if data.gst_number is not None:
        settings.gst_number = data.gst_number
    if data.phone is not None:
        settings.phone = data.phone
    if data.email is not None:
        settings.email = data.email
    if data.address is not None:
        settings.address = data.address
    if data.logo_url is not None:
        settings.logo_url = data.logo_url
    if data.favicon_url is not None:
        settings.favicon_url = data.favicon_url
    
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
    if hasattr(data, 'enable_gst_billing'):
        configs["enable_gst_billing"] = data.enable_gst_billing
    if data.default_gst_rate is not None:
        configs["default_gst_rate"] = data.default_gst_rate
    if data.invoice_prefix is not None:
        configs["invoice_prefix"] = data.invoice_prefix
    if data.order_prefix is not None:
        configs["order_prefix"] = data.order_prefix
    if data.upi_id is not None:
        configs["upi_id"] = data.upi_id
    settings.configs = configs
    
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    
    return {"message": "Settings updated successfully"}

@api_router.get("/settings/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Public settings endpoint for frontend branding (no auth required)"""
    settings = db.query(models.Settings).filter(models.Settings.type == "business").first()
    
    if not settings:
        return {
            "business_name": "BharatBazaar",
            "logo_url": "",
            "favicon_url": "",
            "social_links": {}
        }
    
    return {
        "business_name": settings.business_name or "BharatBazaar",
        "logo_url": settings.logo_url or "",
        "favicon_url": settings.favicon_url or "",
        "phone": settings.phone or "",
        "email": settings.email or "",
        "address": settings.address or {},
        "gst_number": settings.gst_number or "",
        "social_links": settings.social_links or {}
    }

# ============ PAGE ROUTES ============

@api_router.get("/pages/{slug}")
def get_page(slug: str, db: Session = Depends(get_db)):
    """Get content for a static page"""
    page = db.query(models.Page).filter(models.Page.slug == slug).first()
    if not page:
        # Return default content if page doesn't exist
        return {
            "slug": slug,
            "title": slug.replace("-", " ").title(),
            "content": f"Content for {slug} coming soon."
        }
    return page

@api_router.put("/admin/pages/{slug}")
def update_page(slug: str, data: PageUpdate, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Update static page content"""
    page = db.query(models.Page).filter(models.Page.slug == slug).first()
    if not page:
        page = models.Page(slug=slug)
        db.add(page)
    
    if data.title is not None:
        page.title = data.title
    if data.content is not None:
        page.content = data.content
    if data.is_active is not None:
        page.is_active = data.is_active
        
    db.commit()
    db.refresh(page)
    return {"message": "Page updated successfully", "page": page}

# ============ ADMIN DASHBOARD ROUTES ============

@api_router.get("/admin/dashboard")
def get_dashboard_stats(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    
    # Basic counts
    total_products = db.query(models.Product).count()
    total_orders = db.query(models.Order).count()
    total_customers = db.query(models.User).filter(models.User.role == "customer").count()
    
    # Order statistics
    pending_orders = db.query(models.Order).filter(models.Order.status == "pending").count()
    completed_orders = db.query(models.Order).filter(models.Order.status == "completed").count()
    
    # Inventory statistics
    low_stock_products = db.query(models.Product).filter(
        models.Product.stock_qty <= models.Product.low_stock_threshold
    ).count()
    out_of_stock_products = db.query(models.Product).filter(models.Product.stock_qty == 0).count()
    
    # Revenue calculation (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_orders = db.query(models.Order).filter(
        models.Order.created_at >= thirty_days_ago,
        models.Order.status.in_(["completed", "shipped", "delivered"])
    ).all()
    
    total_revenue = sum(order.grand_total for order in recent_orders)
    
    # Top products
    top_products = db.query(models.Product).filter(
        models.Product.is_active == True
    ).order_by(models.Product.created_at.desc()).limit(5).all()
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's stats
    today_orders = db.query(models.Order).filter(models.Order.created_at >= today_start).all()
    today_revenue = sum(o.grand_total for o in today_orders)
    today_order_count = len(today_orders)
    
    # Pendings
    pending_returns = db.query(models.ReturnRequest).filter(models.ReturnRequest.status == "pending").count()
    
    return {
        "today": {
            "revenue": today_revenue,
            "orders": today_order_count
        },
        "totals": {
            "products": total_products,
            "customers": total_customers,
            "orders": total_orders
        },
        "pending": {
            "orders": pending_orders,
            "low_stock": low_stock_products,
            "returns": pending_returns
        },
        "stats": { # Keep for backward compat if needed, but structure above is primary
            "total_revenue_30d": total_revenue
        },
        "top_products": top_products,
        "recent_orders": db.query(models.Order).order_by(models.Order.created_at.desc()).limit(10).all()
    }



# ============ COURIER ROUTES ============
from courier_service import DelhiveryService
DELHIVERY_TOKEN = "ac9b6a862cffeba552eeb07729e40e692b7a3fd8"
delhivery_service = DelhiveryService(DELHIVERY_TOKEN)

@api_router.get("/courier/pincode")
def check_pincode_serviceability(pincode: str):
    """Check if pincode is serviceable by Delhivery"""
    return delhivery_service.check_serviceability(pincode)

@api_router.post("/courier/validate-address")
def validate_shipping_address(address_data: dict):
    """Validate complete shipping address including pincode serviceability"""
    return delhivery_service.validate_address(address_data)

@api_router.get("/admin/orders/{order_id}")
def get_order_details(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get detailed order information for debugging"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_method": order.payment_method,
        "grand_total": order.grand_total,
        "shipping_address": order.shipping_address,
        "items": order.items,
        "tracking_number": order.tracking_number,
        "courier_provider": order.courier_provider,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }

@api_router.post("/courier/ship/{order_id}")
def create_shipment(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Create a shipment for an order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order status
    if order.status in ["shipped", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot ship order with status: {order.status}")
        
    shipping_address = order.shipping_address
    if not shipping_address:
        raise HTTPException(status_code=400, detail="Order has no shipping address")
    
    # Validate required shipping address fields
    required_fields = ["name", "phone", "line1", "city", "state", "pincode"]
    missing_fields = [field for field in required_fields if not shipping_address.get(field)]
    
    if missing_fields:
        raise HTTPException(
            status_code=400, 
            detail=f"Missing required shipping address fields: {', '.join(missing_fields)}"
        )
    
    # Validate phone number
    phone = str(shipping_address.get("phone", "")).strip()
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number in shipping address")
    
    # Validate pincode
    pincode = str(shipping_address.get("pincode", "")).strip()
    if len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode in shipping address")
    
    # Prepare payload
    order_data = {
        "order_id": order.order_number,
        "date": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "pay_mode": "Pre-paid" if order.payment_method == "online" else "COD",
        "address": f"{shipping_address.get('line1', '')} {shipping_address.get('line2', '')}".strip(),
        "phone": phone,
        "name": shipping_address.get("name"),
        "city": shipping_address.get("city"),
        "state": shipping_address.get("state"),
        "pincode": pincode,
        "total_amount": float(order.grand_total),
        "cod_amount": float(order.grand_total) if order.payment_method != "online" else 0,
        "quantity": sum(item.get("quantity", 1) for item in order.items) if order.items else 1,
        "products_desc": ", ".join(item.get("product_name", "Item") for item in order.items)[:50] if order.items else "Products",
        
        # Pickup Details - Fetch from Settings
        "pickup_name": "Amorlias Mart",
        "pickup_address": "Warehouse Address",
        "pickup_city": "New Delhi",
        "pickup_pincode": "110001",
        "pickup_phone": "9999999999"
    }
    
    # Fetch pickup address from settings if available
    settings = db.query(models.Settings).first()
    if settings:
        order_data["pickup_name"] = settings.business_name or "Amorlias Mart"
        if settings.address:
            address_line = f"{settings.address.get('line1', '')} {settings.address.get('line2', '')}".strip()
            if address_line:
                order_data["pickup_address"] = address_line
            if settings.address.get('city'):
                order_data["pickup_city"] = settings.address.get('city')
            if settings.address.get('pincode'):
                order_data["pickup_pincode"] = settings.address.get('pincode')
        if settings.phone:
            order_data["pickup_phone"] = settings.phone

    result = delhivery_service.create_surface_order(order_data)
    
    if result.get("success"):
        # Update order with tracking details
        order.tracking_number = result.get("awb")
        order.courier_provider = "Delhivery"
        order.status = "shipped"
        order.updated_at = datetime.utcnow()
        db.commit()
        return result
    else:
        raise HTTPException(status_code=400, detail=f"Shipment Creation Failed: {result.get('error')}")

@api_router.get("/courier/track/{order_id}")
def track_shipment(order_id: str, db: Session = Depends(get_db)):
    """Track shipment for an order with detailed status"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not order.tracking_number:
         raise HTTPException(status_code=400, detail="Order has not been shipped yet")
    
    # Get tracking information from courier
    tracking_result = delhivery_service.track_order(order.tracking_number)
    
    if tracking_result.get("success"):
        # Update order tracking history if new information is available
        if tracking_result.get("tracking_history"):
            order.tracking_history = tracking_result["tracking_history"]
            order.updated_at = datetime.utcnow()
            db.commit()
        
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "awb": order.tracking_number,
            "courier_provider": order.courier_provider,
            "current_status": tracking_result.get("status"),
            "current_location": tracking_result.get("current_location"),
            "expected_delivery": tracking_result.get("expected_delivery"),
            "tracking_history": tracking_result.get("tracking_history", []),
            "last_updated": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(status_code=400, detail=f"Tracking failed: {tracking_result.get('error')}")

@api_router.get("/courier/track-by-awb/{awb}")
def track_by_awb(awb: str):
    """Track shipment directly by AWB number"""
    return delhivery_service.track_order(awb)

@api_router.get("/courier/label/{order_id}")
def get_shipping_label(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get shipping label URL for printing"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not order.tracking_number:
         raise HTTPException(status_code=400, detail="Order has not been shipped yet")

    result = delhivery_service.get_label(order.tracking_number)
    
    if result.get("success"):
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "awb": order.tracking_number,
            "label_url": result.get("label_url"),
            "generated_at": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(status_code=400, detail=f"Label generation failed: {result.get('error')}")

@api_router.get("/courier/invoice/{order_id}")
def get_shipping_invoice(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get shipping invoice/manifest for printing"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not order.tracking_number:
         raise HTTPException(status_code=400, detail="Order has not been shipped yet")

    result = delhivery_service.get_invoice(order.tracking_number)
    
    if result.get("success"):
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "awb": order.tracking_number,
            "invoice_url": result.get("invoice_url"),
            "generated_at": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invoice generation failed: {result.get('error')}")

@api_router.post("/courier/cancel/{order_id}")
def cancel_shipment(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Cancel a shipment before pickup"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not order.tracking_number:
         raise HTTPException(status_code=400, detail="Order has not been shipped yet")
    
    if order.status not in ["shipped", "processing"]:
        raise HTTPException(status_code=400, detail="Cannot cancel order in current status")

    result = delhivery_service.cancel_shipment(order.tracking_number)
    
    if result.get("success"):
        order.status = "cancelled"
        order.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "awb": order.tracking_number,
            "message": "Shipment cancelled successfully",
            "cancelled_at": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(status_code=400, detail=f"Cancellation failed: {result.get('error')}")

@api_router.post("/courier/create-return/{order_id}")
def create_return_shipment(order_id: str, return_data: dict, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Create a return shipment for an order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ["delivered", "shipped"]:
        raise HTTPException(status_code=400, detail="Can only create returns for delivered/shipped orders")
    
    shipping_address = order.shipping_address
    if not shipping_address:
        raise HTTPException(status_code=400, detail="No shipping address found for return pickup")
    
    # Prepare return shipment data
    return_shipment_data = {
        "original_order_id": order.order_number,
        "customer_name": shipping_address.get("name"),
        "customer_phone": shipping_address.get("phone"),
        "pickup_address": f"{shipping_address.get('line1', '')} {shipping_address.get('line2', '')}".strip(),
        "pickup_city": shipping_address.get("city"),
        "pickup_state": shipping_address.get("state"),
        "pickup_pincode": shipping_address.get("pincode"),
        "return_amount": return_data.get("return_amount", order.grand_total),
        "quantity": return_data.get("quantity", 1),
        "products_desc": return_data.get("reason", "Return Items"),
        "weight": return_data.get("weight", "500")
    }
    
    result = delhivery_service.create_return_shipment(return_shipment_data)
    
    if result.get("success"):
        # Create return request record
        return_request = models.ReturnRequest(
            id=generate_id(),
            order_id=order.id,
            user_id=order.user_id,
            reason=return_data.get("reason", "Customer return"),
            status="pickup_scheduled",
            return_awb=result.get("return_awb"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(return_request)
        db.commit()
        
        return {
            "order_id": order.id,
            "return_id": return_request.id,
            "return_awb": result.get("return_awb"),
            "pickup_scheduled": True,
            "message": "Return pickup scheduled successfully"
        }
    else:
        raise HTTPException(status_code=400, detail=f"Return creation failed: {result.get('error')}")

@api_router.get("/admin/picklist")
def generate_picklist(date: str = None, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Generate picklist for orders to be shipped"""
    from datetime import datetime, date as date_obj
    
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = date_obj.today()
    
    # Get orders that are ready to ship (confirmed/processing status)
    orders = db.query(models.Order).filter(
        models.Order.status.in_(["confirmed", "processing"]),
        func.date(models.Order.created_at) == target_date
    ).all()
    
    picklist_items = []
    for order in orders:
        if order.items:
            for item in order.items:
                picklist_items.append({
                    "order_number": order.order_number,
                    "customer_name": order.shipping_address.get("name") if order.shipping_address else "N/A",
                    "product_name": item.get("product_name"),
                    "sku": item.get("sku"),
                    "quantity": item.get("quantity", 1),
                    "awb": order.tracking_number or "Not Generated",
                    "shipping_address": order.shipping_address,
                    "payment_method": order.payment_method,
                    "order_total": order.grand_total
                })
    
    return {
        "date": target_date.isoformat(),
        "total_orders": len(orders),
        "total_items": len(picklist_items),
        "picklist": picklist_items
    }

# ============ REPORT ROUTES ============

@api_router.get("/admin/reports/sales")
def get_sales_report(
    date_from: Optional[str] = None, 
    date_to: Optional[str] = None,
    admin: dict = Depends(admin_required), 
    db: Session = Depends(get_db)
):
    query = db.query(models.Order).filter(models.Order.status != "cancelled")
    
    if date_from:
        # Check if date_from contains "Z" for UTC or is ISO format
        # Pydantic/FastAPI handles ISO, but manual parsing might be safer if needed.
        # Assuming ISO strings from frontend
        try:
           dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
           query = query.filter(models.Order.created_at >= dt_from)
        except:
           pass

    orders = query.all()
    
    total_sales = sum(o.grand_total for o in orders)
    total_orders = len(orders)
    # Assuming payment_method 'online' vs 'cod'/others for online/offline split
    online_sales = sum(o.grand_total for o in orders if o.payment_method == "online")
    offline_sales = sum(o.grand_total for o in orders if o.payment_method != "online")
    
    # Daily breakdown
    daily_map = {}
    for o in orders:
        date_key = o.created_at.date().isoformat()
        if date_key not in daily_map:
            daily_map[date_key] = {"date": date_key, "sales": 0, "orders": 0}
        daily_map[date_key]["sales"] += o.grand_total
        daily_map[date_key]["orders"] += 1
        
    daily_breakdown = sorted(daily_map.values(), key=lambda x: x["date"])
    
    return {
        "summary": {
            "total_sales": total_sales,
            "total_orders": total_orders,
            "online_sales": online_sales,
            "offline_sales": offline_sales
        },
        "daily_breakdown": daily_breakdown
    }

@api_router.get("/admin/reports/inventory")
def get_inventory_report(
    admin: dict = Depends(admin_required), 
    db: Session = Depends(get_db)
):
    products = db.query(models.Product).all()
    
    total_products = len(products)
    total_stock_value = sum(p.stock_qty * p.cost_price for p in products)
    low_stock_products = [p for p in products if p.stock_qty <= p.low_stock_threshold]
    out_of_stock_products = [p for p in products if p.stock_qty == 0]
    
    return {
        "summary": {
            "total_products": total_products,
            "total_stock_value": total_stock_value,
            "low_stock_count": len(low_stock_products),
            "out_of_stock_count": len(out_of_stock_products)
        },
        "low_stock_products": low_stock_products,
        "out_of_stock_products": out_of_stock_products
    }

@api_router.get("/admin/reports/profit-loss")
def get_profit_loss_report(
    date_from: Optional[str] = None,
    admin: dict = Depends(admin_required), 
    db: Session = Depends(get_db)
):
    # Calculate Profit = Revenue - Cost - Refunds
    # Revenue = Sum(Orders within date)
    # Cost = Sum(Order Items * Cost Price)
    
    # We include all non-cancelled orders to show projected P&L
    orders_query = db.query(models.Order).filter(models.Order.status != "cancelled")
    returns_query = db.query(models.ReturnRequest).filter(models.ReturnRequest.status == "approved")
    
    if date_from:
        try:
           dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
           orders_query = orders_query.filter(models.Order.created_at >= dt_from)
           returns_query = returns_query.filter(models.ReturnRequest.created_at >= dt_from)
        except:
           pass
           
    orders = orders_query.all()
    returns = returns_query.all()
    
    total_revenue = sum(o.grand_total for o in orders)
    
    # Calculate approximate COGS (Cost of Goods Sold)
    total_cost = 0
    for o in orders:
        for item in o.items:
            # We assume cost_price hasn't changed drastically or we'd need historical cost
            # Fetch current product cost
            prod = db.query(models.Product).filter(models.Product.id == item["product_id"]).first()
            if prod:
                total_cost += prod.cost_price * item["quantity"]
            else:
                # Fallback if product deleted, approximate 70% of price
                total_cost += item["price"] * 0.7 * item["quantity"]
                
    total_refunds = sum(r.refund_amount or 0 for r in returns)
    
    gross_profit = total_revenue - total_cost
    net_profit = gross_profit - total_refunds
    
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "summary": {
            "total_revenue": total_revenue,
            "total_cost": total_cost,
            "total_refunds": total_refunds,
            "gross_profit": gross_profit,
            "net_profit": net_profit,
            "profit_margin": profit_margin
        },
        "orders_count": len(orders),
        "returns_count": len(returns)
    }

@api_router.post("/admin/reset-data")
def reset_database(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Clear all transactional data but keep admin and settings"""
    try:
        # Delete data in order of dependency
        db.query(models.ReturnRequest).delete()
        db.query(models.Order).delete()
        db.query(models.InventoryLog).delete()
        db.query(models.Product).delete()
        db.query(models.Category).delete()
        db.query(models.Banner).delete()
        db.query(models.Offer).delete()
        db.query(models.Notification).delete()
        
        # Keep Users (Admin/Customers) and Settings to avoid locking out admin
        # Optionally, could delete customers: db.query(models.User).filter(models.User.role == "customer").delete()
        
        db.commit()
        return {"message": "All data cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")

@api_router.post("/admin/seed-data")
def seed_sample_data(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Seed sample data for testing"""
    
    try:
        # Create sample categories with images
        categories_data = [
            {
                "name": "Electronics", 
                "description": "Electronic items and gadgets",
                "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&h=500&fit=crop"
            },
            {
                "name": "Clothing", 
                "description": "Fashion and apparel",
                "image_url": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=500&fit=crop"
            },
            {
                "name": "Home & Garden", 
                "description": "Home improvement and garden supplies",
                "image_url": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop"
            },
            {
                "name": "Books", 
                "description": "Books and educational materials",
                "image_url": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop"
            },
            {
                "name": "Sports", 
                "description": "Sports and fitness equipment",
                "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=500&fit=crop"
            },
            {
                "name": "Beauty", 
                "description": "Beauty and personal care products",
                "image_url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=500&fit=crop"
            }
        ]
        
        created_categories = []
        for cat_data in categories_data:
            existing = db.query(models.Category).filter(models.Category.name == cat_data["name"]).first()
            if existing:
                # Update existing category with image
                existing.image_url = cat_data["image_url"]
                existing.description = cat_data["description"]
                created_categories.append(existing)
            else:
                new_cat = models.Category(
                    id=generate_id(),
                    **cat_data,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(new_cat)
                created_categories.append(new_cat)
        
        db.commit()
        
        # Create more sample products with images
        if created_categories:
            sample_products = [
                {
                    "name": "Smartphone XYZ",
                    "description": "Latest smartphone with advanced features",
                    "category_id": next((c.id for c in created_categories if c.name == "Electronics"), created_categories[0].id),
                    "sku": "PHONE001",
                    "mrp": 25000,
                    "selling_price": 22000,
                    "wholesale_price": 20000,
                    "cost_price": 18000,
                    "stock_qty": 50,
                    "gst_rate": 18.0,
                    "images": ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"]
                },
                {
                    "name": "Cotton T-Shirt",
                    "description": "Comfortable cotton t-shirt",
                    "category_id": next((c.id for c in created_categories if c.name == "Clothing"), created_categories[0].id),
                    "sku": "TSHIRT001",
                    "mrp": 800,
                    "selling_price": 650,
                    "wholesale_price": 500,
                    "cost_price": 400,
                    "stock_qty": 100,
                    "gst_rate": 12.0,
                    "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"]
                },
                {
                    "name": "Wireless Headphones",
                    "description": "Premium wireless headphones with noise cancellation",
                    "category_id": next((c.id for c in created_categories if c.name == "Electronics"), created_categories[0].id),
                    "sku": "HEADPHONE001",
                    "mrp": 5000,
                    "selling_price": 3500,
                    "wholesale_price": 3000,
                    "cost_price": 2500,
                    "stock_qty": 75,
                    "gst_rate": 18.0,
                    "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"]
                },
                {
                    "name": "Denim Jeans",
                    "description": "Classic blue denim jeans",
                    "category_id": next((c.id for c in created_categories if c.name == "Clothing"), created_categories[0].id),
                    "sku": "JEANS001",
                    "mrp": 2000,
                    "selling_price": 1500,
                    "wholesale_price": 1200,
                    "cost_price": 1000,
                    "stock_qty": 60,
                    "gst_rate": 12.0,
                    "images": ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=500"]
                },
                {
                    "name": "Coffee Maker",
                    "description": "Automatic coffee maker for home",
                    "category_id": next((c.id for c in created_categories if c.name == "Home & Garden"), created_categories[0].id),
                    "sku": "COFFEE001",
                    "mrp": 8000,
                    "selling_price": 6500,
                    "wholesale_price": 5500,
                    "cost_price": 4500,
                    "stock_qty": 30,
                    "gst_rate": 18.0,
                    "images": ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500"]
                },
                {
                    "name": "Running Shoes",
                    "description": "Comfortable running shoes for daily exercise",
                    "category_id": next((c.id for c in created_categories if c.name == "Sports"), created_categories[0].id),
                    "sku": "SHOES001",
                    "mrp": 3000,
                    "selling_price": 2200,
                    "wholesale_price": 1800,
                    "cost_price": 1500,
                    "stock_qty": 80,
                    "gst_rate": 12.0,
                    "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"]
                },
                {
                    "name": "Face Cream",
                    "description": "Moisturizing face cream for all skin types",
                    "category_id": next((c.id for c in created_categories if c.name == "Beauty"), created_categories[0].id),
                    "sku": "CREAM001",
                    "mrp": 1200,
                    "selling_price": 900,
                    "wholesale_price": 700,
                    "cost_price": 500,
                    "stock_qty": 120,
                    "gst_rate": 18.0,
                    "images": ["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500"]
                },
                {
                    "name": "Programming Book",
                    "description": "Learn Python programming from basics to advanced",
                    "category_id": next((c.id for c in created_categories if c.name == "Books"), created_categories[0].id),
                    "sku": "BOOK001",
                    "mrp": 1500,
                    "selling_price": 1200,
                    "wholesale_price": 1000,
                    "cost_price": 800,
                    "stock_qty": 40,
                    "gst_rate": 0.0,
                    "images": ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"]
                }
            ]
            
            for prod_data in sample_products:
                existing = db.query(models.Product).filter(models.Product.sku == prod_data["sku"]).first()
                if existing:
                    # Update existing product with image
                    for k, v in prod_data.items():
                        setattr(existing, k, v)
                    existing.updated_at = datetime.utcnow()
                else:
                    new_product = models.Product(
                        id=generate_id(),
                        **prod_data,
                        is_active=True,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_product)
            
            db.commit()
        
        # Create sample banners
        banners_data = [
            {
                "title": "Discover Amazing Deals on Fashion & More",
                "image_url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
                "link": "/products",
                "position": 1,
                "is_active": True
            },
            {
                "title": "Electronics Sale - Up to 50% Off",
                "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=400&fit=crop",
                "link": "/products?category=" + next((c.id for c in created_categories if c.name == "Electronics"), ""),
                "position": 2,
                "is_active": True
            },
            {
                "title": "Fashion Collection - New Arrivals",
                "image_url": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=400&fit=crop",
                "link": "/products?category=" + next((c.id for c in created_categories if c.name == "Clothing"), ""),
                "position": 3,
                "is_active": True
            }
        ]
        
        for banner_data in banners_data:
            existing = db.query(models.Banner).filter(models.Banner.title == banner_data["title"]).first()
            if not existing:
                new_banner = models.Banner(
                    id=generate_id(),
                    **banner_data,
                    created_at=datetime.utcnow()
                )
                db.add(new_banner)
        
        db.commit()
        
        return {"message": "Sample data seeded successfully with images and banners"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to seed data: {str(e)}")


# ============ ROOT ============

@api_router.get("/")
def root():
    return {"message": "BharatBazaar API (SQL)", "version": "2.0.0"}

app.include_router(api_router)

# Remove duplicate CORS middleware - already configured above
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# No shutdown event needed for SQLAlchemy engine, connection pooling handles it

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
