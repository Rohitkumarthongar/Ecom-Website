"""
Admin endpoints - Complete CRUD operations for all admin resources
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import admin_required
from app import models

router = APIRouter()

# =============== Pydantic Schemas ===============

class CourierCreate(BaseModel):
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
    is_test_mode: bool = True
    is_active: bool = True

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    category_id: Optional[str] = None
    mrp: float
    selling_price: float
    wholesale_price: Optional[float] = None
    wholesale_min_qty: Optional[int] = 10
    cost_price: float
    stock_qty: int = 0
    low_stock_threshold: Optional[int] = 10
    gst_rate: Optional[float] = 18.0
    hsn_code: Optional[str] = None
    weight: Optional[float] = None
    color: Optional[str] = None
    material: Optional[str] = None
    origin: Optional[str] = None
    images: List[str] = []
    variants: List[dict] = []
    is_active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[str] = None
    mrp: Optional[float] = None
    selling_price: Optional[float] = None
    wholesale_price: Optional[float] = None
    wholesale_min_qty: Optional[int] = None
    cost_price: Optional[float] = None
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    gst_rate: Optional[float] = None
    hsn_code: Optional[str] = None
    weight: Optional[float] = None
    color: Optional[str] = None
    material: Optional[str] = None
    origin: Optional[str] = None
    images: Optional[List[str]] = None
    variants: Optional[List[dict]] = None
    is_active: Optional[bool] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

class BannerCreate(BaseModel):
    title: str
    image_url: str
    link_url: Optional[str] = None
    position: int = 0
    is_active: bool = True

class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    discount_percentage: Optional[float] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True

# =============== Dashboard ===============

@router.get("/dashboard")
def admin_dashboard(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Admin dashboard statistics"""
    # Get today's sales
    today = datetime.now().date()
    today_orders_query = db.query(models.Order).filter(
        func.date(models.Order.created_at) == today
    ).all()
    today_revenue = sum(order.grand_total for order in today_orders_query)
    
    # Total statistics
    total_products = db.query(models.Product).count()
    total_orders = db.query(models.Order).count()
    total_customers = db.query(models.User).filter(models.User.role == "customer").count()
    
    pending_orders_count = db.query(models.Order).filter(
        models.Order.status.in_(["pending", "processing"])
    ).count()
    
    pending_returns_count = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.status == "pending"
    ).count()
    
    # Low stock
    low_stock_query = db.query(models.Product).filter(
        models.Product.stock_qty <= models.Product.low_stock_threshold
    )
    low_stock_count = low_stock_query.count()
    low_stock_items = low_stock_query.limit(5).all()
    
    # Recent orders
    recent_orders = db.query(models.Order).order_by(
        desc(models.Order.created_at)
    ).limit(10).all()
    
    return {
        "today": {
            "revenue": float(today_revenue),
            "orders": len(today_orders_query)
        },
        "totals": {
            "products": total_products,
            "orders": total_orders,
            "customers": total_customers
        },
        "pending": {
            "orders": pending_orders_count,
            "low_stock": low_stock_count,
            "returns": pending_returns_count
        },
        "recent_orders": recent_orders,
        "low_stock_products": low_stock_items,
        "admin": admin["name"]
    }

# =============== Couriers ===============

@router.get("/couriers")
def get_couriers(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get all couriers"""
    couriers = db.query(models.Courier).order_by(models.Courier.priority).all()
    return couriers

@router.post("/couriers")
def create_courier(
    courier: CourierCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new courier"""
    db_courier = models.Courier(**courier.dict())
    db.add(db_courier)
    db.commit()
    db.refresh(db_courier)
    return db_courier

@router.put("/couriers/{courier_id}")
def update_courier(
    courier_id: str,
    courier: CourierCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update courier"""
    db_courier = db.query(models.Courier).filter(models.Courier.id == courier_id).first()
    if not db_courier:
        raise HTTPException(status_code=404, detail="Courier not found")
    
    for key, value in courier.dict().items():
        setattr(db_courier, key, value)
    
    db.commit()
    db.refresh(db_courier)
    return db_courier

@router.delete("/couriers/{courier_id}")
def delete_courier(
    courier_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Delete courier"""
    db_courier = db.query(models.Courier).filter(models.Courier.id == courier_id).first()
    if not db_courier:
        raise HTTPException(status_code=404, detail="Courier not found")
    
    db.delete(db_courier)
    db.commit()
    return {"message": "Courier deleted"}

# =============== Payment Gateways ===============

@router.get("/payment-gateways")
def get_payment_gateways(admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get all payment gateways"""
    gateways = db.query(models.PaymentGateway).all()
    return gateways

@router.post("/payment-gateways")
def create_payment_gateway(
    gateway: PaymentGatewayCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new payment gateway"""
    db_gateway = models.PaymentGateway(**gateway.dict())
    db.add(db_gateway)
    db.commit()
    db.refresh(db_gateway)
    return db_gateway

@router.put("/payment-gateways/{gateway_id}")
def update_payment_gateway(
    gateway_id: str,
    gateway: PaymentGatewayCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update payment gateway"""
    db_gateway = db.query(models.PaymentGateway).filter(models.PaymentGateway.id == gateway_id).first()
    if not db_gateway:
        raise HTTPException(status_code=404, detail="Payment gateway not found")
    
    for key, value in gateway.dict().items():
        setattr(db_gateway, key, value)
    
    db.commit()
    db.refresh(db_gateway)
    return db_gateway

@router.delete("/payment-gateways/{gateway_id}")
def delete_payment_gateway(
    gateway_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Delete payment gateway"""
    db_gateway = db.query(models.PaymentGateway).filter(models.PaymentGateway.id == gateway_id).first()
    if not db_gateway:
        raise HTTPException(status_code=404, detail="Payment gateway not found")
    
    db.delete(db_gateway)
    db.commit()
    return {"message": "Payment gateway deleted"}

# =============== Products (Admin) ===============

@router.post("/products")
def create_product(
    product: ProductCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new product"""
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/products/{product_id}")
def update_product(
    product_id: str,
    product: ProductUpdate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update product"""
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product.dict(exclude_unset=True).items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Delete product"""
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted"}

@router.post("/products/bulk-upload")
def bulk_upload_products(
    products: List[ProductCreate],
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Bulk upload products"""
    created_products = []
    for product_data in products:
        db_product = models.Product(**product_data.dict())
        db.add(db_product)
        created_products.append(db_product)
    
    db.commit()
    for product in created_products:
        db.refresh(product)
    
    return {"message": f"{len(created_products)} products created", "products": created_products}

# =============== Categories (Admin) ===============

@router.post("/categories")
def create_category(
    category: CategoryCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new category"""
    db_category = models.Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.put("/categories/{category_id}")
def update_category(
    category_id: str,
    category: CategoryCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update category"""
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.dict().items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Delete category"""
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted"}

# =============== Banners (Admin) ===============

@router.post("/banners")
def create_banner(
    banner: BannerCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new banner"""
    db_banner = models.Banner(**banner.dict())
    db.add(db_banner)
    db.commit()
    db.refresh(db_banner)
    return db_banner

@router.put("/banners/{banner_id}")
def update_banner(
    banner_id: str,
    banner: BannerCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update banner"""
    db_banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    for key, value in banner.dict().items():
        setattr(db_banner, key, value)
    
    db.commit()
    db.refresh(db_banner)
    return db_banner

@router.delete("/banners/{banner_id}")
def delete_banner(
    banner_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Delete banner"""
    db_banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    db.delete(db_banner)
    db.commit()
    return {"message": "Banner deleted"}

# =============== Offers (Admin) ===============

@router.post("/offers")
def create_offer(
    offer: OfferCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new offer"""
    db_offer = models.Offer(**offer.dict())
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.put("/offers/{offer_id}")
def update_offer(
    offer_id: str,
    offer: OfferCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update offer"""
    db_offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    for key, value in offer.dict().items():
        setattr(db_offer, key, value)
    
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.delete("/offers/{offer_id}")
def delete_offer(
    offer_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Delete offer"""
    db_offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    db.delete(db_offer)
    db.commit()
    return {"message": "Offer deleted"}

# =============== Inventory ===============


def calculate_sold_qty_map(db: Session):
    """Calculate total sold quantity for each product from non-cancelled orders"""
    orders = db.query(models.Order).filter(models.Order.status != "cancelled").all()
    sold_map = {}
    
    for order in orders:
        if not order.items:
            continue
            
        # items is a list of dicts stored in JSON
        for item in order.items:
            # Handle possible key variations
            pid = item.get("product_id") or item.get("id")
            qty = item.get("quantity", 0)
            
            if pid:
                if isinstance(qty, (int, float)):
                    sold_map[pid] = sold_map.get(pid, 0) + int(qty)
    
    return sold_map

@router.get("/inventory")
def get_inventory(
    low_stock_only: bool = False,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get all inventory items with stats"""
    query = db.query(models.Product)
    
    if low_stock_only:
        query = query.filter(models.Product.stock_qty <= models.Product.low_stock_threshold)
    
    products = query.all()
    
    # Calculate stats
    all_products = db.query(models.Product).all()
    sold_map = calculate_sold_qty_map(db)
    
    total_value = sum(p.selling_price * p.stock_qty for p in all_products)
    low_stock = len([p for p in all_products if 0 < p.stock_qty <= p.low_stock_threshold])
    out_of_stock = len([p for p in all_products if p.stock_qty == 0])
    
    enriched_products = []
    for p in products:
        # Convert to dict manually to add custom field
        p_dict = {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category_id": p.category_id,
            "mrp": p.mrp,
            "selling_price": p.selling_price,
            "wholesale_price": p.wholesale_price,
            "wholesale_min_qty": p.wholesale_min_qty,
            "cost_price": p.cost_price,
            "stock_qty": p.stock_qty,
            "low_stock_threshold": p.low_stock_threshold,
            "images": p.images,
            "variants": p.variants,
            "gst_rate": p.gst_rate,
            "hsn_code": p.hsn_code,
            "weight": p.weight,
            "color": p.color,
            "material": p.material,
            "origin": p.origin,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "sold_qty": sold_map.get(p.id, 0)
        }
        enriched_products.append(p_dict)
    
    return {
        "products": enriched_products,
        "stats": {
            "total_products": len(all_products),
            "total_inventory_value": float(total_value),
            "low_stock_count": low_stock,
            "out_of_stock": out_of_stock
        }
    }

@router.put("/inventory/{product_id}")
def update_inventory(
    product_id: str,
    stock_qty: int,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update product inventory"""
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_product.stock_qty = stock_qty
    db.commit()
    db.refresh(db_product)
    return db_product

# =============== Orders (Admin) ===============

@router.get("/orders")
def get_all_orders(
    status: Optional[str] = None,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get all orders with optional status filter"""
    query = db.query(models.Order)
    
    if status:
        query = query.filter(models.Order.status == status)
    
    orders = query.order_by(desc(models.Order.created_at)).all()
    return {"orders": orders}

@router.put("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    status: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update order status"""
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db_order.status = status
    db.commit()
    db.refresh(db_order)
    return db_order

# =============== Returns (Admin) ===============

@router.get("/returns")
def get_all_returns(
    status: Optional[str] = None,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get all return requests"""
    query = db.query(models.ReturnRequest)
    
    if status:
        query = query.filter(models.ReturnRequest.status == status)
    
    returns = query.order_by(desc(models.ReturnRequest.created_at)).all()
    return {"returns": returns}

@router.put("/returns/{return_id}")
def update_return_status(
    return_id: str,
    status: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update return request status"""
    db_return = db.query(models.ReturnRequest).filter(models.ReturnRequest.id == return_id).first()
    if not db_return:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    db_return.status = status
    db.commit()
    db.refresh(db_return)
    return db_return

# =============== Reports ===============

@router.get("/reports/sales")
def get_sales_report(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get sales report"""
    query = db.query(models.Order).filter(models.Order.status.in_(["delivered", "completed"]))
    
    if date_from:
        query = query.filter(models.Order.created_at >= date_from)
    if date_to:
        query = query.filter(models.Order.created_at <= date_to)
    
    orders = query.all()
    
    # Calculate totals
    total_sales = sum(order.grand_total for order in orders)
    online_sales = sum(order.grand_total for order in orders if not order.is_offline)
    offline_sales = sum(order.grand_total for order in orders if order.is_offline)
    
    # Daily breakdown
    from collections import defaultdict
    daily_data = defaultdict(lambda: {"sales": 0, "orders": 0})
    for order in orders:
        date_key = order.created_at.date().isoformat()
        daily_data[date_key]["sales"] += order.grand_total
        daily_data[date_key]["orders"] += 1
    
    daily_breakdown = [
        {"date": date, "sales": data["sales"], "orders": data["orders"]}
        for date, data in sorted(daily_data.items())
    ]
    
    return {
        "summary": {
            "total_sales": float(total_sales),
            "total_orders": len(orders),
            "online_sales": float(online_sales),
            "offline_sales": float(offline_sales),
        },
        "daily_breakdown": daily_breakdown
    }

@router.get("/reports/inventory")
def get_inventory_report(
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get inventory report"""
    products = db.query(models.Product).all()
    
    total_value = sum(product.selling_price * product.stock_qty for product in products)
    low_stock = [p for p in products if 0 < p.stock_qty < 10]
    out_of_stock = [p for p in products if p.stock_qty == 0]
    
    return {
        "summary": {
            "total_products": len(products),
            "total_stock_value": float(total_value),
            "low_stock_count": len(low_stock),
            "out_of_stock_count": len(out_of_stock)
        },
        "low_stock_products": low_stock,
        "out_of_stock_products": out_of_stock
    }

@router.get("/reports/inventory-status")
def get_inventory_status_report(
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get inventory status summary"""
    products = db.query(models.Product).all()
    categories = {c.id: c.name for c in db.query(models.Category).all()}
    
    sold_map = calculate_sold_qty_map(db)
    
    products_data = []
    total_stock_value = 0
    total_available_value = 0
    out_of_stock_count = 0
    low_stock_count = 0
    
    for p in products:
        category_name = categories.get(p.category_id, "Uncategorized")
        stock_value = p.selling_price * p.stock_qty
        
        # Determine status
        if p.stock_qty == 0:
            status = "out_of_stock"
            out_of_stock_count += 1
        elif p.stock_qty <= p.low_stock_threshold:
            status = "low_stock"
            low_stock_count += 1
        else:
            status = "in_stock"
            
        sold_qty = sold_map.get(p.id, 0)
            
        products_data.append({
            "product_id": p.id,
            "product_name": p.name,
            "sku": p.sku,
            "category_name": category_name,
            "original_stock": p.stock_qty + sold_qty, # Reconstruct original
            "sold_qty": sold_qty,
            "total_stock": p.stock_qty,
            "current_stock": p.stock_qty,
            "blocked_qty": 0,
            "available_qty": p.stock_qty,
            "low_stock_threshold": p.low_stock_threshold,
            "stock_status": status,
            "stock_value": stock_value,
            "available_value": stock_value,
            "selling_price": p.selling_price
        })
        
        total_stock_value += stock_value
        total_available_value += stock_value
    
    return {
        "summary": {
            "total_products": len(products),
            "total_stock_value": float(total_stock_value),
            "total_available_value": float(total_available_value),
            "total_blocked_value": 0,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count
        },
        "products": products_data
    }

@router.get("/reports/profit-loss")
def get_profit_loss_report(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get profit/loss report"""
    query = db.query(models.Order).filter(models.Order.status.in_(["delivered", "completed"]))
    
    if date_from:
        query = query.filter(models.Order.created_at >= date_from)
    if date_to:
        query = query.filter(models.Order.created_at <= date_to)
    
    orders = query.all()
    revenue = sum(order.grand_total for order in orders)
    
    # Calculate costs (simplified - using subtotal as approximation)
    total_cost = sum(order.subtotal * 0.6 for order in orders)  # Assuming 40% margin
    gross_profit = revenue - total_cost
    
    # Get refunds/returns
    returns_query = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.status == "approved"
    )
    if date_from:
        returns_query = returns_query.filter(models.ReturnRequest.created_at >= date_from)
    if date_to:
        returns_query = returns_query.filter(models.ReturnRequest.created_at <= date_to)
    
    returns = returns_query.all()
    total_refunds = sum(r.refund_amount for r in returns if r.refund_amount)
    
    net_profit = gross_profit - total_refunds
    profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
    
    return {
        "summary": {
            "total_revenue": float(revenue),
            "total_cost": float(total_cost),
            "gross_profit": float(gross_profit),
            "total_refunds": float(total_refunds),
            "net_profit": float(net_profit),
            "profit_margin": float(profit_margin)
        },
        "orders_count": len(orders),
        "returns_count": len(returns),
        "average_order_value": float(revenue / len(orders)) if orders else 0
    }

# =============== Customers ===============

@router.get("/customers")
def get_customers(
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get all customers"""
    customers = db.query(models.User).filter(models.User.role == "customer").all()
    return customers

@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get customer details"""
    customer = db.query(models.User).filter(models.User.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/customers/{customer_id}")
def update_customer(
    customer_id: str,
    is_active: bool,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update customer status"""
    customer = db.query(models.User).filter(models.User.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer.is_active = is_active
    db.commit()
    db.refresh(customer)
    return customer

# =============== Notifications (Admin) ===============

@router.get("/notifications")
def get_admin_notifications(
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get admin notifications"""
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == admin["id"]
    ).order_by(desc(models.Notification.created_at)).limit(50).all()
    return notifications

@router.get("/notifications/unread-count")
def get_unread_notifications_count(
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get unread notifications count"""
    count = db.query(models.Notification).filter(
        models.Notification.user_id == admin["id"],
        models.Notification.read == False
    ).count()
    return {"count": count}

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    db.commit()
    return {"message": "Notification marked as read"}

# =============== Seller Requests ===============

@router.get("/seller-requests")
def get_seller_requests(
    status: Optional[str] = None,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get seller requests"""
    query = db.query(models.SellerRequest)
    
    if status:
        query = query.filter(models.SellerRequest.status == status)
    
    requests = query.order_by(desc(models.SellerRequest.created_at)).all()
    return requests

@router.put("/seller-requests/{request_id}")
def update_seller_request(
    request_id: str,
    status: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update seller request status"""
    request = db.query(models.SellerRequest).filter(
        models.SellerRequest.id == request_id
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request.status = status
    
    # Update user role if approved
    if status == "approved":
        user = db.query(models.User).filter(models.User.id == request.user_id).first()
        if user:
            user.role = "seller"
    
    db.commit()
    db.refresh(request)
    return request

# =============== POS ===============

@router.post("/pos/sale")
def create_pos_sale(
    sale_data: dict,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create offline POS sale"""
    sale_data['is_offline'] = True
    sale_data['status'] = 'completed'
    
    # Create order
    order = models.Order(**sale_data)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.get("/pos/search-customer")
def search_customer(
    phone: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Search for customer by phone"""
    customer = db.query(models.User).filter(models.User.phone == phone).first()
    return customer if customer else None

# =============== Pages ===============

@router.put("/pages/{slug}")
def update_page(
    slug: str,
    content: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update page content"""
    page = db.query(models.Page).filter(models.Page.slug == slug).first()
    if not page:
        # Create page if it doesn't exist
        page = models.Page(slug=slug, content=content)
        db.add(page)
    else:
        page.content = content
    
    db.commit()
    db.refresh(page)
    return page

# =============== Picklist ===============

@router.get("/picklist")
def get_picklist(
    date: Optional[str] = None,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get picklist for orders"""
    query = db.query(models.Order).filter(
        models.Order.status.in_(["pending", "processing"])
    )
    
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.Order.created_at) == target_date)
    
    orders = query.all()
    return orders

# =============== Team Management ===============

class TeamMemberCreate(BaseModel):
    name: str
    email: str
    phone: str

@router.get("/team")
def get_team_members(
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Get all team members (admins and customers)"""
    users = db.query(models.User).order_by(desc(models.User.created_at)).all()
    return {"users": users}

@router.post("/team")
def create_team_member(
    member: TeamMemberCreate,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Create new admin/team member"""
    # Check if user exists
    if db.query(models.User).filter(models.User.email == member.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.query(models.User).filter(models.User.phone == member.phone).first():
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    # Generate temporary password
    import secrets
    temp_password = secrets.token_urlsafe(8)
    
    # Create user
    from app.core.security import get_password_hash
    new_user = models.User(
        name=member.name,
        email=member.email,
        phone=member.phone,
        password=get_password_hash(temp_password),
        role="admin",
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"user": new_user, "temporary_password": temp_password}

@router.delete("/team/{user_id}")
def remove_admin_access(
    user_id: str,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Remove admin access"""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = "customer"
    db.commit()
    return {"message": "Admin access removed"}

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role_data: dict,
    admin: dict = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Update user role"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_id == admin["id"] and role_data.get("role") != "admin":
         raise HTTPException(status_code=400, detail="Cannot downgrade your own role")
    
    user.role = role_data.get("role")
    db.commit()
    return user