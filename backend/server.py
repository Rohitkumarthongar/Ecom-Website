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
    is_wholesale: bool = False
    address: Optional[Dict[str, str]] = None
    role: str = "customer"  # customer, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    gst_number: Optional[str] = None
    password: str

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
    allowed_fields = ["name", "email", "address"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

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
    errors = []
    
    for product in products:
        try:
            existing = await db.products.find_one({"sku": product.sku}, {"_id": 0})
            if existing:
                errors.append(f"SKU {product.sku} already exists")
                continue
            
            product_doc = {
                "id": generate_id(),
                **product.model_dump(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product_doc)
            created += 1
        except Exception as e:
            errors.append(str(e))
    
    return {"created": created, "errors": errors}

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
        
        # Determine price based on user type and quantity
        price = product["selling_price"]
        if user and user.get("is_wholesale") and item.quantity >= product.get("wholesale_min_qty", 10):
            price = product.get("wholesale_price", product["selling_price"])
        
        item_total = price * item.quantity
        gst_amount = item_total * (product.get("gst_rate", 18) / 100)
        
        items_with_details.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "sku": product["sku"],
            "quantity": item.quantity,
            "price": price,
            "mrp": product["mrp"],
            "gst_rate": product.get("gst_rate", 18),
            "gst_amount": gst_amount,
            "total": item_total + gst_amount
        })
        subtotal += item_total
        
        # Update stock
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock_qty": -item.quantity}}
        )
    
    total_gst = sum(i["gst_amount"] for i in items_with_details)
    grand_total = subtotal + total_gst
    
    order_doc = {
        "id": generate_id(),
        "order_number": generate_order_number(),
        "user_id": user["id"] if user else None,
        "customer_phone": data.customer_phone or (user["phone"] if user else None),
        "items": items_with_details,
        "subtotal": subtotal,
        "gst_total": total_gst,
        "grand_total": grand_total,
        "shipping_address": data.shipping_address,
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "status": "pending",
        "is_offline": data.is_offline,
        "tracking_number": None,
        "courier_provider": None,
        "notes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    
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
            "order_prefix": "ORD"
        }
    return settings

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
        "tracking_number": order.get("tracking_number", ""),
        "courier": order.get("courier_provider", ""),
        "from_address": settings.get("address", {}) if settings else {},
        "to_address": order["shipping_address"],
        "items_count": len(order["items"]),
        "weight": sum(1 for i in order["items"]),  # Placeholder
        "cod_amount": order["grand_total"] if order["payment_method"] == "cod" else 0
    }
    
    return label

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
