from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="BharatBazaar API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'bharatbazaar-secret-key-2024')
JWT_ALGORITHM = "HS256"

# ============ MODELS ============

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    is_gst_verified: bool = False
    address: Optional[Dict[str, str]] = None
    addresses: Optional[List[Dict[str, str]]] = []
    role: str = "customer"  # customer, seller, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    gst_number: Optional[str] = None
    password: str
    request_seller: bool = False  # User requesting seller upgrade

class AdminCreate(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    password: str

class UserAddressUpdate(BaseModel):
    addresses: List[Dict[str, str]]

class SellerRequest(BaseModel):
    user_id: str
    business_name: Optional[str] = None
    gst_number: Optional[str] = None

class PincodeVerify(BaseModel):
    pincode: str

class UserLogin(BaseModel):
    phone: str
    password: str

class OTPRequest(BaseModel):
    phone: str

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
    payment_method: str = "cod"  # cod, phonepe, paytm, upi, card
    is_offline: bool = False
    customer_phone: Optional[str] = None
    apply_gst: bool = True  # Option to include GST or not
    discount_amount: float = 0  # Manual discount
    discount_percentage: float = 0  # Percentage discount

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
    discount_type: str = "percentage"  # percentage, flat
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
    name: str  # phonepe, paytm, razorpay, upi
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
    upi_id: Optional[str] = None  # For QR payment

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

# ============ HELPER FUNCTIONS ============

def generate_id():
    return str(uuid.uuid4())

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def admin_required(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def generate_otp():
    return str(random.randint(100000, 999999))

def generate_order_number():
    return f"ORD{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"

def generate_invoice_number():
    return f"INV{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"

# ============ AUTH ROUTES ============

@api_router.post("/auth/send-otp")
async def send_otp(data: OTPRequest):
    otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.otps.update_one(
        {"phone": data.phone},
        {"$set": {"otp": otp, "expiry": expiry.isoformat(), "verified": False}},
        upsert=True
    )
    
    # TODO: Integrate Twilio SMS
    # For now, return OTP in response (remove in production)
    return {"message": "OTP sent successfully", "otp_for_testing": otp}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    otp_doc = await db.otps.find_one({"phone": data.phone}, {"_id": 0})
    if not otp_doc:
        raise HTTPException(status_code=400, detail="No OTP found for this phone")
    
    if otp_doc.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    expiry = datetime.fromisoformat(otp_doc["expiry"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    await db.otps.update_one({"phone": data.phone}, {"$set": {"verified": True}})
    return {"message": "OTP verified successfully", "verified": True}

@api_router.post("/auth/register")
async def register(data: UserCreate):
    # Check if OTP was verified
    otp_doc = await db.otps.find_one({"phone": data.phone, "verified": True}, {"_id": 0})
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Please verify OTP first")
    
    # Check if user exists
    existing = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = generate_id()
    is_wholesale = bool(data.gst_number)
    
    user_doc = {
        "id": user_id,
        "phone": data.phone,
        "name": data.name,
        "email": data.email,
        "gst_number": data.gst_number,
        "is_gst_verified": False,
        "is_wholesale": is_wholesale,
        "password": hash_password(data.password),
        "role": "customer",
        "address": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await db.otps.delete_one({"phone": data.phone})
    
    token = create_token(user_id, "customer")
    user_doc.pop("password")
    user_doc.pop("_id", None)
    
    return {"token": token, "user": user_doc}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    user.pop("password")
    
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    user.pop("password", None)
    return user

@api_router.put("/auth/profile")
async def update_profile(data: dict, user: dict = Depends(get_current_user)):
    allowed_fields = ["name", "email", "address", "addresses"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

# ============ SELLER REQUEST ROUTES ============

@api_router.post("/auth/request-seller")
async def request_seller_upgrade(data: SellerRequest, user: dict = Depends(get_current_user)):
    """User requests to become a seller to access wholesale prices"""
    request_doc = {
        "id": generate_id(),
        "user_id": user["id"],
        "user_name": user["name"],
        "user_phone": user["phone"],
        "business_name": data.business_name,
        "gst_number": data.gst_number,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seller_requests.insert_one(request_doc)
    
    # Create notification for admin
    notification_doc = {
        "id": generate_id(),
        "type": "seller_request",
        "title": "New Seller Request",
        "message": f"{user['name']} has requested seller access",
        "data": {"request_id": request_doc["id"], "user_id": user["id"]},
        "for_admin": True,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    request_doc.pop("_id", None)
    return {"message": "Seller request submitted", "request": request_doc}

@api_router.get("/admin/seller-requests")
async def get_seller_requests(status: Optional[str] = None, admin: dict = Depends(admin_required)):
    query = {}
    if status:
        query["status"] = status
    requests = await db.seller_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.put("/admin/seller-requests/{request_id}")
async def handle_seller_request(request_id: str, data: dict, admin: dict = Depends(admin_required)):
    request = await db.seller_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    status = data.get("status", "approved")
    await db.seller_requests.update_one({"id": request_id}, {"$set": {"status": status}})
    
    if status == "approved":
        # Upgrade user to seller
        await db.users.update_one(
            {"id": request["user_id"]},
            {"$set": {"is_seller": True, "is_wholesale": True, "gst_number": request.get("gst_number")}}
        )
        
        # Notify user
        notification_doc = {
            "id": generate_id(),
            "type": "seller_approved",
            "title": "Seller Request Approved!",
            "message": "Congratulations! Your seller request has been approved. You can now access wholesale prices.",
            "user_id": request["user_id"],
            "for_admin": False,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
    
    return {"message": f"Request {status}"}

# ============ NOTIFICATION ROUTES ============

@api_router.get("/notifications")
async def get_user_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"], "for_admin": False},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    unread_count = await db.notifications.count_documents({"user_id": user["id"], "read": False, "for_admin": False})
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read"}

@api_router.get("/admin/notifications")
async def get_admin_notifications(admin: dict = Depends(admin_required)):
    notifications = await db.notifications.find(
        {"for_admin": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    unread_count = await db.notifications.count_documents({"for_admin": True, "read": False})
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_admin_notification_read(notification_id: str, admin: dict = Depends(admin_required)):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

# ============ PINCODE VERIFICATION ============

@api_router.post("/verify-pincode")
async def verify_pincode(data: PincodeVerify):
    """Verify pincode and return area details"""
    pincode = data.pincode
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode format")
    
    # Check if pincode is serviceable (mock data - in production, use actual API)
    # Indian pincode ranges
    first_digit = int(pincode[0])
    regions = {
        1: "Delhi/Haryana/Punjab/HP/J&K",
        2: "UP/Uttarakhand", 
        3: "Rajasthan/Gujarat",
        4: "Maharashtra/Goa/MP/Chhattisgarh",
        5: "Andhra/Telangana/Karnataka",
        6: "Tamil Nadu/Kerala",
        7: "West Bengal/Odisha/NE States",
        8: "Bihar/Jharkhand"
    }
    
    if first_digit in regions:
        return {
            "valid": True,
            "pincode": pincode,
            "region": regions[first_digit],
            "serviceable": True,
            "estimated_delivery": "3-5 business days"
        }
    
    return {"valid": False, "pincode": pincode, "serviceable": False}

# ============ CATEGORY ROUTES ============

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/categories/{category_id}")
async def get_category(category_id: str):
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@api_router.post("/admin/categories")
async def create_category(data: CategoryCreate, admin: dict = Depends(admin_required)):
    category_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category_doc)
    category_doc.pop("_id", None)
    return category_doc

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, data: dict, admin: dict = Depends(admin_required)):
    await db.categories.update_one({"id": category_id}, {"$set": data})
    return {"message": "Category updated"}

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, admin: dict = Depends(admin_required)):
    await db.categories.delete_one({"id": category_id})
    return {"message": "Category deleted"}

# ============ PRODUCT ROUTES ============

@api_router.get("/products")
async def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20
):
    query = {"is_active": True}
    
    if category_id:
        query["category_id"] = category_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    if min_price:
        query["selling_price"] = {"$gte": min_price}
    if max_price:
        query.setdefault("selling_price", {})["$lte"] = max_price
    
    sort_direction = -1 if sort_order == "desc" else 1
    skip = (page - 1) * limit
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/admin/products")
async def create_product(data: ProductCreate, admin: dict = Depends(admin_required)):
    # Check SKU uniqueness
    existing = await db.products.find_one({"sku": data.sku}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    product_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    product_doc.pop("_id", None)
    return product_doc

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, admin: dict = Depends(admin_required)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return product

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(admin_required)):
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted"}

@api_router.post("/admin/products/bulk-upload")
async def bulk_upload_products(products: List[ProductCreate], admin: dict = Depends(admin_required)):
    created = 0
    updated = 0
    errors = []
    
    for product in products:
        try:
            existing = await db.products.find_one({"sku": product.sku}, {"_id": 0})
            if existing:
                # Update existing product
                await db.products.update_one(
                    {"sku": product.sku},
                    {"$set": {**product.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                updated += 1
            else:
                # Create new product
                product_doc = {
                    "id": generate_id(),
                    **product.model_dump(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.products.insert_one(product_doc)
                created += 1
        except Exception as e:
            errors.append(f"SKU {product.sku}: {str(e)}")
    
    return {"created": created, "updated": updated, "errors": errors}

@api_router.post("/admin/inventory/bulk-update")
async def bulk_update_inventory(updates: List[Dict[str, Any]], admin: dict = Depends(admin_required)):
    """
    Bulk update inventory. Each item should have:
    - sku: Product SKU
    - stock_qty: New stock quantity (optional)
    - adjustment: Amount to add/subtract (optional)
    - low_stock_threshold: New threshold (optional)
    """
    updated = 0
    errors = []
    
    for item in updates:
        try:
            sku = item.get("sku")
            if not sku:
                errors.append("Missing SKU in item")
                continue
            
            product = await db.products.find_one({"sku": sku}, {"_id": 0})
            if not product:
                errors.append(f"SKU {sku} not found")
                continue
            
            update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
            
            if "stock_qty" in item:
                update_fields["stock_qty"] = int(item["stock_qty"])
            elif "adjustment" in item:
                update_fields["stock_qty"] = product["stock_qty"] + int(item["adjustment"])
            
            if "low_stock_threshold" in item:
                update_fields["low_stock_threshold"] = int(item["low_stock_threshold"])
            
            if "selling_price" in item:
                update_fields["selling_price"] = float(item["selling_price"])
            
            if "wholesale_price" in item:
                update_fields["wholesale_price"] = float(item["wholesale_price"])
            
            await db.products.update_one({"sku": sku}, {"$set": update_fields})
            
            # Log inventory movement
            if "stock_qty" in item or "adjustment" in item:
                log_doc = {
                    "id": generate_id(),
                    "product_id": product["id"],
                    "sku": sku,
                    "type": "bulk_update",
                    "previous_qty": product["stock_qty"],
                    "new_qty": update_fields.get("stock_qty", product["stock_qty"]),
                    "notes": item.get("notes", "Bulk inventory update"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": admin["id"]
                }
                await db.inventory_logs.insert_one(log_doc)
            
            updated += 1
        except Exception as e:
            errors.append(f"SKU {item.get('sku', 'unknown')}: {str(e)}")
    
    return {"updated": updated, "errors": errors}

@api_router.get("/admin/inventory/export")
async def export_inventory(admin: dict = Depends(admin_required)):
    """Export inventory data for bulk editing"""
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    export_data = [{
        "sku": p["sku"],
        "name": p["name"],
        "category_id": p.get("category_id", ""),
        "stock_qty": p["stock_qty"],
        "low_stock_threshold": p.get("low_stock_threshold", 10),
        "cost_price": p["cost_price"],
        "selling_price": p["selling_price"],
        "wholesale_price": p.get("wholesale_price", ""),
        "mrp": p["mrp"],
        "gst_rate": p.get("gst_rate", 18)
    } for p in products]
    
    return {"products": export_data, "total": len(export_data)}

@api_router.get("/admin/products/export")
async def export_products(admin: dict = Depends(admin_required)):
    """Export all products data"""
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    return {"products": products, "total": len(products)}

@api_router.get("/admin/inventory/logs")
async def get_inventory_logs(
    product_id: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(admin_required)
):
    """Get inventory change logs"""
    query = {}
    if product_id:
        query["product_id"] = product_id
    
    logs = await db.inventory_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

# ============ INVENTORY ROUTES ============

@api_router.get("/admin/inventory")
async def get_inventory(
    low_stock_only: bool = False,
    category_id: Optional[str] = None,
    admin: dict = Depends(admin_required)
):
    query = {}
    if low_stock_only:
        query["$expr"] = {"$lte": ["$stock_qty", "$low_stock_threshold"]}
    if category_id:
        query["category_id"] = category_id
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    total_value = sum(p["stock_qty"] * p["cost_price"] for p in products)
    low_stock_count = sum(1 for p in products if p["stock_qty"] <= p["low_stock_threshold"])
    out_of_stock = sum(1 for p in products if p["stock_qty"] == 0)
    
    return {
        "products": products,
        "stats": {
            "total_products": len(products),
            "total_inventory_value": total_value,
            "low_stock_count": low_stock_count,
            "out_of_stock": out_of_stock
        }
    }

@api_router.put("/admin/inventory/{product_id}")
async def update_inventory(product_id: str, data: dict, admin: dict = Depends(admin_required)):
    update_fields = {}
    
    if "stock_qty" in data:
        update_fields["stock_qty"] = data["stock_qty"]
    if "adjustment" in data:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if product:
            update_fields["stock_qty"] = product["stock_qty"] + data["adjustment"]
    
    if "low_stock_threshold" in data:
        update_fields["low_stock_threshold"] = data["low_stock_threshold"]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.update_one({"id": product_id}, {"$set": update_fields})
        
        # Log inventory movement
        log_doc = {
            "id": generate_id(),
            "product_id": product_id,
            "type": data.get("type", "adjustment"),
            "quantity": data.get("adjustment", data.get("stock_qty")),
            "notes": data.get("notes", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin["id"]
        }
        await db.inventory_logs.insert_one(log_doc)
    
    return {"message": "Inventory updated"}

# ============ ORDER ROUTES ============

@api_router.post("/orders")
async def create_order(data: OrderCreate, user: Optional[dict] = None):
    try:
        user = await get_current_user(Depends(security))
    except:
        user = None
    
    items_with_details = []
    subtotal = 0
    
    for item in data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
        
        if product["stock_qty"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        
        # Determine price based on user type (seller/wholesale) and quantity
        price = product["selling_price"]
        is_wholesale_price = False
        if user and (user.get("is_wholesale") or user.get("is_seller")) and item.quantity >= product.get("wholesale_min_qty", 10):
            price = product.get("wholesale_price", product["selling_price"])
            is_wholesale_price = True
        
        item_total = price * item.quantity
        
        # Calculate GST only if apply_gst is True
        gst_amount = 0
        if data.apply_gst:
            gst_amount = item_total * (product.get("gst_rate", 18) / 100)
        
        items_with_details.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "sku": product["sku"],
            "quantity": item.quantity,
            "price": price,
            "mrp": product["mrp"],
            "gst_rate": product.get("gst_rate", 18) if data.apply_gst else 0,
            "gst_amount": gst_amount,
            "total": item_total + gst_amount,
            "is_wholesale_price": is_wholesale_price,
            "image_url": product.get("images", [None])[0]
        })
        subtotal += item_total
        
        # Update stock
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock_qty": -item.quantity}}
        )
    
    total_gst = sum(i["gst_amount"] for i in items_with_details) if data.apply_gst else 0
    
    # Apply discounts
    discount = 0
    if data.discount_amount > 0:
        discount = data.discount_amount
    elif data.discount_percentage > 0:
        discount = subtotal * (data.discount_percentage / 100)
    
    grand_total = subtotal + total_gst - discount
    
    order_doc = {
        "id": generate_id(),
        "order_number": generate_order_number(),
        "user_id": user["id"] if user else None,
        "customer_phone": data.customer_phone or (user["phone"] if user else None),
        "items": items_with_details,
        "subtotal": subtotal,
        "gst_applied": data.apply_gst,
        "gst_total": total_gst,
        "discount_amount": discount,
        "grand_total": grand_total,
        "shipping_address": data.shipping_address,
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "status": "pending",
        "is_offline": data.is_offline,
        "tracking_number": None,
        "courier_provider": None,
        "tracking_history": [{"status": "pending", "timestamp": datetime.now(timezone.utc).isoformat(), "note": "Order placed"}],
        "notes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    
    # Create notification for user
    if user:
        notification_doc = {
            "id": generate_id(),
            "type": "order_placed",
            "title": "Order Placed Successfully!",
            "message": f"Your order #{order_doc['order_number']} has been placed.",
            "user_id": user["id"],
            "data": {"order_id": order_doc["id"]},
            "for_admin": False,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
    
    return order_doc

@api_router.get("/orders")
async def get_user_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if user["role"] != "admin" and order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

@api_router.get("/admin/orders")
async def get_all_orders(
    status: Optional[str] = None,
    is_offline: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(admin_required)
):
    query = {}
    if status:
        query["status"] = status
    if is_offline is not None:
        query["is_offline"] = is_offline
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, admin: dict = Depends(admin_required)):
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.tracking_number:
        update_data["tracking_number"] = data.tracking_number
    if data.courier_provider:
        update_data["courier_provider"] = data.courier_provider
    
    if data.notes:
        await db.orders.update_one(
            {"id": order_id},
            {"$push": {"notes": {"text": data.notes, "timestamp": datetime.now(timezone.utc).isoformat(), "by": admin["name"]}}}
        )
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return order

# ============ OFFLINE SALES (POS) ============

@api_router.post("/admin/pos/sale")
async def create_pos_sale(data: OrderCreate, admin: dict = Depends(admin_required)):
    data.is_offline = True
    order = await create_order(data, admin)
    
    # Mark as paid for cash sales
    if data.payment_method == "cash":
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {"payment_status": "paid", "status": "completed"}}
        )
        order["payment_status"] = "paid"
        order["status"] = "completed"
    
    return order

@api_router.get("/admin/pos/search-customer")
async def search_customer(phone: str, admin: dict = Depends(admin_required)):
    user = await db.users.find_one({"phone": phone}, {"_id": 0, "password": 0})
    return user

# ============ RETURNS ============

@api_router.post("/returns")
async def create_return(data: ReturnRequest, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if user["role"] != "admin" and order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return_doc = {
        "id": generate_id(),
        "order_id": data.order_id,
        "user_id": user["id"],
        "items": data.items,
        "reason": data.reason,
        "refund_method": data.refund_method,
        "status": "pending",
        "refund_amount": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.returns.insert_one(return_doc)
    return_doc.pop("_id", None)
    return return_doc

@api_router.get("/admin/returns")
async def get_returns(status: Optional[str] = None, admin: dict = Depends(admin_required)):
    query = {}
    if status:
        query["status"] = status
    
    returns = await db.returns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return returns

@api_router.put("/admin/returns/{return_id}")
async def update_return(return_id: str, data: dict, admin: dict = Depends(admin_required)):
    allowed_fields = ["status", "refund_amount", "notes"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if data.get("status") == "approved" and data.get("restore_stock"):
        return_doc = await db.returns.find_one({"id": return_id}, {"_id": 0})
        for item in return_doc.get("items", []):
            await db.products.update_one(
                {"id": item["product_id"]},
                {"$inc": {"stock_qty": item["quantity"]}}
            )
    
    await db.returns.update_one({"id": return_id}, {"$set": update_data})
    return {"message": "Return updated"}

# ============ BANNERS & OFFERS ============

@api_router.get("/banners")
async def get_banners():
    now = datetime.now(timezone.utc).isoformat()
    banners = await db.banners.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("position", 1).to_list(20)
    return banners

@api_router.post("/admin/banners")
async def create_banner(data: BannerCreate, admin: dict = Depends(admin_required)):
    banner_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.banners.insert_one(banner_doc)
    banner_doc.pop("_id", None)
    return banner_doc

@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, data: dict, admin: dict = Depends(admin_required)):
    await db.banners.update_one({"id": banner_id}, {"$set": data})
    return {"message": "Banner updated"}

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, admin: dict = Depends(admin_required)):
    await db.banners.delete_one({"id": banner_id})
    return {"message": "Banner deleted"}

@api_router.get("/offers")
async def get_offers():
    offers = await db.offers.find({"is_active": True}, {"_id": 0}).to_list(50)
    return offers

@api_router.post("/admin/offers")
async def create_offer(data: OfferCreate, admin: dict = Depends(admin_required)):
    offer_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.offers.insert_one(offer_doc)
    offer_doc.pop("_id", None)
    return offer_doc

@api_router.put("/admin/offers/{offer_id}")
async def update_offer(offer_id: str, data: dict, admin: dict = Depends(admin_required)):
    await db.offers.update_one({"id": offer_id}, {"$set": data})
    return {"message": "Offer updated"}

@api_router.delete("/admin/offers/{offer_id}")
async def delete_offer(offer_id: str, admin: dict = Depends(admin_required)):
    await db.offers.delete_one({"id": offer_id})
    return {"message": "Offer deleted"}

# ============ COURIER PROVIDERS ============

@api_router.get("/admin/couriers")
async def get_couriers(admin: dict = Depends(admin_required)):
    couriers = await db.couriers.find({}, {"_id": 0}).sort("priority", 1).to_list(50)
    return couriers

@api_router.post("/admin/couriers")
async def create_courier(data: CourierProviderCreate, admin: dict = Depends(admin_required)):
    courier_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.couriers.insert_one(courier_doc)
    courier_doc.pop("_id", None)
    return courier_doc

@api_router.put("/admin/couriers/{courier_id}")
async def update_courier(courier_id: str, data: dict, admin: dict = Depends(admin_required)):
    await db.couriers.update_one({"id": courier_id}, {"$set": data})
    return {"message": "Courier updated"}

@api_router.delete("/admin/couriers/{courier_id}")
async def delete_courier(courier_id: str, admin: dict = Depends(admin_required)):
    await db.couriers.delete_one({"id": courier_id})
    return {"message": "Courier deleted"}

# ============ PAYMENT GATEWAYS ============

@api_router.get("/admin/payment-gateways")
async def get_payment_gateways(admin: dict = Depends(admin_required)):
    gateways = await db.payment_gateways.find({}, {"_id": 0}).to_list(20)
    return gateways

@api_router.post("/admin/payment-gateways")
async def create_payment_gateway(data: PaymentGatewayCreate, admin: dict = Depends(admin_required)):
    gateway_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_gateways.insert_one(gateway_doc)
    gateway_doc.pop("_id", None)
    return gateway_doc

@api_router.put("/admin/payment-gateways/{gateway_id}")
async def update_payment_gateway(gateway_id: str, data: dict, admin: dict = Depends(admin_required)):
    await db.payment_gateways.update_one({"id": gateway_id}, {"$set": data})
    return {"message": "Payment gateway updated"}

@api_router.delete("/admin/payment-gateways/{gateway_id}")
async def delete_payment_gateway(gateway_id: str, admin: dict = Depends(admin_required)):
    await db.payment_gateways.delete_one({"id": gateway_id})
    return {"message": "Payment gateway deleted"}

# ============ SETTINGS ============

@api_router.get("/admin/settings")
async def get_settings(admin: dict = Depends(admin_required)):
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    if not settings:
        settings = {
            "type": "business",
            "business_name": "BharatBazaar",
            "gst_number": "",
            "address": {},
            "phone": "",
            "email": "",
            "enable_gst_billing": True,
            "default_gst_rate": 18.0,
            "invoice_prefix": "INV",
            "order_prefix": "ORD",
            "logo_url": "",
            "favicon_url": "",
            "facebook_url": "",
            "instagram_url": "",
            "twitter_url": "",
            "youtube_url": "",
            "whatsapp_number": "",
            "upi_id": ""
        }
    return settings

@api_router.get("/settings/public")
async def get_public_settings():
    """Get public settings (logo, social links) for frontend"""
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    if not settings:
        return {
            "business_name": "BharatBazaar",
            "logo_url": "",
            "favicon_url": "",
            "facebook_url": "",
            "instagram_url": "",
            "twitter_url": "",
            "youtube_url": "",
            "whatsapp_number": ""
        }
    
    return {
        "business_name": settings.get("business_name", "BharatBazaar"),
        "logo_url": settings.get("logo_url", ""),
        "favicon_url": settings.get("favicon_url", ""),
        "facebook_url": settings.get("facebook_url", ""),
        "instagram_url": settings.get("instagram_url", ""),
        "twitter_url": settings.get("twitter_url", ""),
        "youtube_url": settings.get("youtube_url", ""),
        "whatsapp_number": settings.get("whatsapp_number", "")
    }

@api_router.put("/admin/settings")
async def update_settings(data: SettingsUpdate, admin: dict = Depends(admin_required)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["type"] = "business"
    
    await db.settings.update_one(
        {"type": "business"},
        {"$set": update_data},
        upsert=True
    )
    return {"message": "Settings updated"}

# ============ REPORTS ============

@api_router.get("/admin/reports/sales")
async def get_sales_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin: dict = Depends(admin_required)
):
    query = {}
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_sales = sum(o["grand_total"] for o in orders)
    total_orders = len(orders)
    online_sales = sum(o["grand_total"] for o in orders if not o.get("is_offline"))
    offline_sales = sum(o["grand_total"] for o in orders if o.get("is_offline"))
    pending_orders = sum(1 for o in orders if o["status"] == "pending")
    completed_orders = sum(1 for o in orders if o["status"] == "completed")
    
    # Daily breakdown
    daily_sales = {}
    for order in orders:
        date = order["created_at"][:10]
        daily_sales.setdefault(date, {"sales": 0, "orders": 0})
        daily_sales[date]["sales"] += order["grand_total"]
        daily_sales[date]["orders"] += 1
    
    return {
        "summary": {
            "total_sales": total_sales,
            "total_orders": total_orders,
            "online_sales": online_sales,
            "offline_sales": offline_sales,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "average_order_value": total_sales / total_orders if total_orders > 0 else 0
        },
        "daily_breakdown": [{"date": k, **v} for k, v in sorted(daily_sales.items())]
    }

@api_router.get("/admin/reports/inventory")
async def get_inventory_report(admin: dict = Depends(admin_required)):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    total_products = len(products)
    total_stock_value = sum(p["stock_qty"] * p["cost_price"] for p in products)
    total_retail_value = sum(p["stock_qty"] * p["selling_price"] for p in products)
    low_stock = [p for p in products if p["stock_qty"] <= p["low_stock_threshold"]]
    out_of_stock = [p for p in products if p["stock_qty"] == 0]
    
    # Category breakdown
    category_breakdown = {}
    for p in products:
        cat_id = p.get("category_id", "uncategorized")
        category_breakdown.setdefault(cat_id, {"count": 0, "stock_value": 0})
        category_breakdown[cat_id]["count"] += 1
        category_breakdown[cat_id]["stock_value"] += p["stock_qty"] * p["cost_price"]
    
    return {
        "summary": {
            "total_products": total_products,
            "total_stock_value": total_stock_value,
            "total_retail_value": total_retail_value,
            "low_stock_count": len(low_stock),
            "out_of_stock_count": len(out_of_stock),
            "potential_profit": total_retail_value - total_stock_value
        },
        "low_stock_products": low_stock[:20],
        "out_of_stock_products": out_of_stock[:20],
        "category_breakdown": category_breakdown
    }

@api_router.get("/admin/reports/profit-loss")
async def get_profit_loss_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin: dict = Depends(admin_required)
):
    query = {"status": {"$in": ["completed", "delivered"]}}
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(o["grand_total"] for o in orders)
    
    # Calculate cost
    total_cost = 0
    for order in orders:
        for item in order["items"]:
            product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
            if product:
                total_cost += product["cost_price"] * item["quantity"]
    
    # Get returns
    returns_query = {"status": "approved"}
    if date_from:
        returns_query["created_at"] = {"$gte": date_from}
    if date_to:
        returns_query.setdefault("created_at", {})["$lte"] = date_to
    
    returns = await db.returns.find(returns_query, {"_id": 0}).to_list(1000)
    total_refunds = sum(r.get("refund_amount", 0) for r in returns)
    
    gross_profit = total_revenue - total_cost
    net_profit = gross_profit - total_refunds
    
    return {
        "summary": {
            "total_revenue": total_revenue,
            "total_cost": total_cost,
            "gross_profit": gross_profit,
            "total_refunds": total_refunds,
            "net_profit": net_profit,
            "profit_margin": (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        },
        "orders_count": len(orders),
        "returns_count": len(returns)
    }

# ============ INVOICE & LABELS ============

@api_router.get("/admin/orders/{order_id}/invoice")
async def get_invoice(order_id: str, admin: dict = Depends(admin_required)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    
    invoice = {
        "invoice_number": generate_invoice_number(),
        "order": order,
        "business": settings or {},
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    return invoice

@api_router.get("/admin/orders/{order_id}/label")
async def get_shipping_label(order_id: str, admin: dict = Depends(admin_required)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    
    label = {
        "order_number": order["order_number"],
        "order_date": order["created_at"],
        "tracking_number": order.get("tracking_number", ""),
        "courier": order.get("courier_provider", ""),
        "from_address": settings.get("address", {}) if settings else {},
        "from_name": settings.get("business_name", "BharatBazaar") if settings else "BharatBazaar",
        "from_phone": settings.get("phone", "") if settings else "",
        "to_address": order["shipping_address"],
        "items_count": sum(i["quantity"] for i in order["items"]),
        "weight": sum(1 for i in order["items"]),  # Placeholder
        "cod_amount": order["grand_total"] if order["payment_method"] == "cod" else 0,
        "payment_method": order["payment_method"],
        "items_summary": [{"name": i["product_name"], "qty": i["quantity"]} for i in order["items"]]
    }
    
    return label

@api_router.get("/admin/orders/{order_id}/packing-slip")
async def get_packing_slip(order_id: str, admin: dict = Depends(admin_required)):
    """Generate packing slip with item details for warehouse"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    
    packing_slip = {
        "slip_number": f"PS{order['order_number'][3:]}",
        "order_number": order["order_number"],
        "order_date": order["created_at"],
        "customer_name": order["shipping_address"].get("name", ""),
        "customer_phone": order.get("customer_phone", ""),
        "shipping_address": order["shipping_address"],
        "items": [{
            "product_name": item["product_name"],
            "sku": item["sku"],
            "quantity": item["quantity"],
            "image_url": item.get("image_url", ""),
            "location": f"Rack-{hash(item['sku']) % 100}"  # Mock warehouse location
        } for item in order["items"]],
        "total_items": sum(i["quantity"] for i in order["items"]),
        "total_skus": len(order["items"]),
        "special_instructions": order.get("notes", []),
        "packed_by": "",
        "packed_at": "",
        "business_name": settings.get("business_name", "BharatBazaar") if settings else "BharatBazaar",
        "logo_url": settings.get("logo_url", "") if settings else ""
    }
    
    return packing_slip

@api_router.get("/admin/orders/bulk-labels")
async def get_bulk_labels(date: Optional[str] = None, admin: dict = Depends(admin_required)):
    """Get labels for all orders of a specific date (for daily printing)"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {
        "created_at": {"$regex": f"^{date}"},
        "status": {"$in": ["pending", "processing"]}
    }
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(100)
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    
    labels = []
    for order in orders:
        labels.append({
            "order_number": order["order_number"],
            "tracking_number": order.get("tracking_number", ""),
            "courier": order.get("courier_provider", ""),
            "from_name": settings.get("business_name", "BharatBazaar") if settings else "BharatBazaar",
            "to_name": order["shipping_address"].get("name", ""),
            "to_address": f"{order['shipping_address'].get('line1', '')} {order['shipping_address'].get('city', '')} - {order['shipping_address'].get('pincode', '')}",
            "to_phone": order["shipping_address"].get("phone", ""),
            "items_count": sum(i["quantity"] for i in order["items"]),
            "cod_amount": order["grand_total"] if order["payment_method"] == "cod" else 0
        })
    
    return {"date": date, "total_orders": len(labels), "labels": labels}

# ============ ORDER TRACKING ============

@api_router.put("/admin/orders/{order_id}/tracking")
async def update_order_tracking(order_id: str, data: dict, admin: dict = Depends(admin_required)):
    """Update order tracking with history"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    tracking_entry = {
        "status": data.get("status", order["status"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": data.get("note", ""),
        "location": data.get("location", "")
    }
    
    update_data = {
        "status": data.get("status", order["status"]),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.get("tracking_number"):
        update_data["tracking_number"] = data["tracking_number"]
    if data.get("courier_provider"):
        update_data["courier_provider"] = data["courier_provider"]
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {"tracking_history": tracking_entry}
        }
    )
    
    # Notify user about tracking update
    if order.get("user_id"):
        notification_doc = {
            "id": generate_id(),
            "type": "order_update",
            "title": f"Order #{order['order_number']} Update",
            "message": f"Your order status: {data.get('status', order['status']).upper()}. {data.get('note', '')}",
            "user_id": order["user_id"],
            "data": {"order_id": order_id},
            "for_admin": False,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated_order

# ============ PRODUCT LOOKUP BY BARCODE/SKU ============

@api_router.get("/products/lookup")
async def lookup_product(sku: Optional[str] = None, barcode: Optional[str] = None):
    """Lookup product by SKU or barcode for POS scanning"""
    query = {}
    if sku:
        query["sku"] = {"$regex": f"^{sku}$", "$options": "i"}
    elif barcode:
        query["$or"] = [
            {"sku": barcode},
            {"barcode": barcode}
        ]
    else:
        raise HTTPException(status_code=400, detail="Provide SKU or barcode")
    
    product = await db.products.find_one(query, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

# ============ CUSTOMER MANAGEMENT ============

@api_router.get("/admin/customers")
async def get_customers(
    search: Optional[str] = None,
    is_seller: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(admin_required)
):
    query = {"role": "customer"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if is_seller is not None:
        query["is_seller"] = is_seller
    
    skip = (page - 1) * limit
    customers = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"customers": customers, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/admin/customers/{customer_id}")
async def get_customer(customer_id: str, admin: dict = Depends(admin_required)):
    customer = await db.users.find_one({"id": customer_id}, {"_id": 0, "password": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get customer's orders
    orders = await db.orders.find({"user_id": customer_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {"customer": customer, "recent_orders": orders}

@api_router.put("/admin/customers/{customer_id}")
async def update_customer(customer_id: str, data: dict, admin: dict = Depends(admin_required)):
    allowed_fields = ["name", "email", "is_seller", "is_wholesale", "gst_number", "addresses"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one({"id": customer_id}, {"$set": update_data})
    
    return {"message": "Customer updated"}

# ============ QR CODE FOR PAYMENT ============

@api_router.get("/payment/qr")
async def get_payment_qr(amount: float):
    """Generate UPI QR code data for payment"""
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    upi_id = settings.get("upi_id", "merchant@upi") if settings else "merchant@upi"
    business_name = settings.get("business_name", "BharatBazaar") if settings else "BharatBazaar"
    
    # UPI deep link format
    upi_string = f"upi://pay?pa={upi_id}&pn={business_name}&am={amount}&cu=INR"
    
    return {
        "upi_string": upi_string,
        "upi_id": upi_id,
        "amount": amount,
        "business_name": business_name
    }

# ============ STATIC PAGES ============

@api_router.get("/pages/privacy-policy")
async def get_privacy_policy():
    page = await db.pages.find_one({"slug": "privacy-policy"}, {"_id": 0})
    return page or {"title": "Privacy Policy", "content": "Privacy policy content goes here..."}

@api_router.get("/pages/contact")
async def get_contact_page():
    page = await db.pages.find_one({"slug": "contact"}, {"_id": 0})
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    return {
        "page": page or {"title": "Contact Us", "content": ""},
        "business": settings or {}
    }

@api_router.post("/contact")
async def submit_contact(data: ContactMessage):
    message_doc = {
        "id": generate_id(),
        **data.model_dump(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contact_messages.insert_one(message_doc)
    return {"message": "Message sent successfully"}

@api_router.put("/admin/pages/{slug}")
async def update_page(slug: str, data: dict, admin: dict = Depends(admin_required)):
    await db.pages.update_one(
        {"slug": slug},
        {"$set": {**data, "slug": slug, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Page updated"}

# ============ DASHBOARD STATS ============

@api_router.get("/admin/dashboard")
async def get_dashboard_stats(admin: dict = Depends(admin_required)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's stats
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today.isoformat()}})
    today_sales = await db.orders.find({"created_at": {"$gte": today.isoformat()}}, {"_id": 0}).to_list(1000)
    today_revenue = sum(o["grand_total"] for o in today_sales)
    
    # Overall stats
    total_orders = await db.orders.count_documents({})
    total_products = await db.products.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    
    # Pending items
    pending_orders = await db.orders.count_documents({"status": "pending"})
    low_stock = await db.products.count_documents({"$expr": {"$lte": ["$stock_qty", "$low_stock_threshold"]}})
    pending_returns = await db.returns.count_documents({"status": "pending"})
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Low stock alerts
    low_stock_products = await db.products.find(
        {"$expr": {"$lte": ["$stock_qty", "$low_stock_threshold"]}},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    return {
        "today": {
            "orders": today_orders,
            "revenue": today_revenue
        },
        "totals": {
            "orders": total_orders,
            "products": total_products,
            "customers": total_customers
        },
        "pending": {
            "orders": pending_orders,
            "low_stock": low_stock,
            "returns": pending_returns
        },
        "recent_orders": recent_orders,
        "low_stock_products": low_stock_products
    }

# ============ SEED DATA ============

@api_router.post("/admin/seed-data")
async def seed_data(admin: dict = Depends(admin_required)):
    # Create categories
    categories = [
        {"id": generate_id(), "name": "Fashion", "description": "Clothing & Accessories", "image_url": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500", "is_active": True},
        {"id": generate_id(), "name": "Electronics", "description": "Gadgets & Electronics", "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500", "is_active": True},
        {"id": generate_id(), "name": "Home & Kitchen", "description": "Home essentials", "image_url": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500", "is_active": True},
        {"id": generate_id(), "name": "Beauty", "description": "Beauty & Personal Care", "image_url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500", "is_active": True},
    ]
    
    for cat in categories:
        cat["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.categories.update_one({"name": cat["name"]}, {"$set": cat}, upsert=True)
    
    # Create sample products
    products = [
        {"name": "Banarasi Silk Saree", "sku": "SAR001", "category_id": categories[0]["id"], "mrp": 2999, "selling_price": 1499, "wholesale_price": 1199, "cost_price": 800, "stock_qty": 50, "gst_rate": 5, "images": ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500"]},
        {"name": "Wireless Earbuds Pro", "sku": "ELE001", "category_id": categories[1]["id"], "mrp": 3999, "selling_price": 1999, "wholesale_price": 1599, "cost_price": 1000, "stock_qty": 100, "gst_rate": 18, "images": ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500"]},
        {"name": "Stainless Steel Cookware Set", "sku": "HOM001", "category_id": categories[2]["id"], "mrp": 4999, "selling_price": 2999, "wholesale_price": 2499, "cost_price": 1500, "stock_qty": 30, "gst_rate": 18, "images": ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500"]},
        {"name": "Vitamin C Serum", "sku": "BEA001", "category_id": categories[3]["id"], "mrp": 999, "selling_price": 599, "wholesale_price": 449, "cost_price": 200, "stock_qty": 200, "gst_rate": 12, "images": ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500"]},
        {"name": "Cotton Kurti Set", "sku": "SAR002", "category_id": categories[0]["id"], "mrp": 1499, "selling_price": 799, "wholesale_price": 599, "cost_price": 350, "stock_qty": 80, "gst_rate": 5, "images": ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500"]},
        {"name": "Smart Watch Fitness", "sku": "ELE002", "category_id": categories[1]["id"], "mrp": 5999, "selling_price": 2999, "wholesale_price": 2499, "cost_price": 1500, "stock_qty": 45, "gst_rate": 18, "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"]},
    ]
    
    for prod in products:
        prod["id"] = generate_id()
        prod["description"] = f"High quality {prod['name']}"
        prod["low_stock_threshold"] = 10
        prod["wholesale_min_qty"] = 10
        prod["is_active"] = True
        prod["created_at"] = datetime.now(timezone.utc).isoformat()
        prod["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.update_one({"sku": prod["sku"]}, {"$set": prod}, upsert=True)
    
    # Create banners
    banners = [
        {"id": generate_id(), "title": "Mega Sale", "image_url": "https://images.pexels.com/photos/5869617/pexels-photo-5869617.jpeg?w=1200", "link": "/products", "position": 1, "is_active": True},
        {"id": generate_id(), "title": "New Arrivals", "image_url": "https://images.pexels.com/photos/5868274/pexels-photo-5868274.jpeg?w=1200", "link": "/products", "position": 2, "is_active": True},
    ]
    
    for banner in banners:
        banner["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.banners.update_one({"title": banner["title"]}, {"$set": banner}, upsert=True)
    
    return {"message": "Seed data created successfully"}

# Root route
@api_router.get("/")
async def root():
    return {"message": "BharatBazaar API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
