"""
Order endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional, admin_required
from app.core.utils import generate_order_number, generate_id
from app import models

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic schemas
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

class OrderCancellationRequest(BaseModel):
    reason: str
    cancellation_type: str = "customer"

class ReturnRequestCreate(BaseModel):
    items: List[Dict[str, Any]]
    reason: str
    return_type: str = "defective"
    refund_method: str = "original"
    images: Optional[List[str]] = []
    videos: Optional[List[str]] = []
    description: Optional[str] = None

@router.post("/")
def create_order(data: OrderCreate, request: Request, db: Session = Depends(get_db)):
    """Create a new order"""
    user = get_current_user_optional(request, db)
    
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to place orders")

    # Validate and fetch products
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
        if user and user.get("is_wholesale") and item.quantity >= (prod.wholesale_min_qty or 10):
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
            "gst_rate": prod.gst_rate,
            "image_url": prod.images[0] if prod.images else None
        })
        subtotal += item_total
        
        # Update stock
        prod.stock_qty -= item.quantity

    total_gst = sum(i["gst_amount"] for i in items_valid)
    
    # Handle discount
    discount_amount = data.discount_amount
    if data.discount_percentage > 0:
        discount_amount = subtotal * (data.discount_percentage / 100)
    
    grand_total = subtotal + total_gst - discount_amount
    
    new_order = models.Order(
        id=generate_id(),
        order_number=generate_order_number(),
        user_id=user["id"] if user else None,
        customer_phone=data.customer_phone,
        items=items_valid,
        subtotal=subtotal,
        gst_applied=data.apply_gst,
        gst_total=total_gst,
        discount_amount=discount_amount,
        grand_total=grand_total,
        shipping_address=data.shipping_address,
        payment_method=data.payment_method,
        status="pending",
        is_offline=data.is_offline,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    return new_order

@router.get("/")
def get_user_orders(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's orders"""
    orders = db.query(models.Order).filter(
        models.Order.user_id == user["id"]
    ).order_by(models.Order.created_at.desc()).limit(100).all()
    
    # Enrich orders with current product information
    enriched_orders = []
    for order in orders:
        order_dict = {
            "id": order.id,
            "order_number": order.order_number,
            "user_id": order.user_id,
            "customer_phone": order.customer_phone,
            "subtotal": order.subtotal,
            "gst_applied": order.gst_applied,
            "gst_total": order.gst_total,
            "discount_amount": order.discount_amount,
            "grand_total": order.grand_total,
            "shipping_address": order.shipping_address,
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "status": order.status,
            "is_offline": order.is_offline,
            "tracking_number": order.tracking_number,
            "courier_provider": order.courier_provider,
            "tracking_history": order.tracking_history,
            "notes": order.notes,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "items": []
        }
        
        # Enrich items with current product images if missing
        if order.items:
            for item in order.items:
                enriched_item = dict(item) if isinstance(item, dict) else item
                
                # If image_url is missing, fetch from current product
                if not enriched_item.get("image_url"):
                    product_id = enriched_item.get("product_id")
                    if product_id:
                        product = db.query(models.Product).filter(models.Product.id == product_id).first()
                        if product and product.images and len(product.images) > 0:
                            enriched_item["image_url"] = product.images[0]
                
                order_dict["items"].append(enriched_item)
        
        enriched_orders.append(order_dict)
    
    return enriched_orders

@router.get("/{order_id}")
def get_order_by_id(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get single order by ID"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@router.get("/{order_id}/can-cancel")
def check_cancellation_eligibility(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if order can be cancelled"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    can_cancel = order.status in ["pending", "confirmed", "processing"]
    
    return {
        "can_cancel": can_cancel,
        "reason": "Order can be cancelled" if can_cancel else f"Cannot cancel order with status: {order.status}"
    }

@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, data: OrderCancellationRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cancel an order"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status in ["delivered", "cancelled", "returned"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel order with status: {order.status}")
    
    # Update order status
    order.status = "cancelled"
    order.updated_at = datetime.utcnow()
    
    # Add to tracking history
    if not order.tracking_history:
        order.tracking_history = []
    
    tracking_entry = {
        "status": "cancelled",
        "timestamp": datetime.utcnow().isoformat(),
        "notes": f"Order cancelled: {data.reason}",
        "updated_by": user["name"]
    }
    order.tracking_history.append(tracking_entry)
    
    # Restore inventory
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.get("product_id")).first()
        if product:
            product.stock_qty += item.get("quantity", 1)
    
    db.commit()
    
    return {
        "message": "Order cancelled successfully",
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "cancelled",
        "refund_amount": order.grand_total,
        "refund_timeline": "3-5 business days"
    }

@router.get("/{order_id}/can-return")
def check_return_eligibility(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if order can be returned"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    can_return = order.status == "delivered"
    
    # Check return window (5 days)
    if order.updated_at:
        days_since_delivery = (datetime.utcnow() - order.updated_at).days
        if days_since_delivery > 5:
            can_return = False
    
    return {
        "can_return": can_return,
        "reason": "Order can be returned" if can_return else "Return window expired or order not delivered"
    }

@router.post("/{order_id}/return")
def create_return_request(order_id: str, data: ReturnRequestCreate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a return request"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != "delivered":
        raise HTTPException(status_code=400, detail="Only delivered orders can be returned")
    
    # Calculate refund amount
    refund_amount = 0
    for return_item in data.items:
        for order_item in order.items:
            if order_item.get("product_id") == return_item.get("product_id"):
                item_price = order_item.get("price", 0)
                return_qty = return_item.get("quantity", 1)
                refund_amount += item_price * return_qty
                break
    
    # Create return request
    return_request = models.ReturnRequest(
        id=generate_id(),
        order_id=order.id,
        user_id=order.user_id,
        items=data.items,
        reason=f"{data.return_type}: {data.reason}",
        refund_method=data.refund_method,
        status="pending",
        refund_amount=refund_amount,
        notes=data.description,
        evidence_images=data.images or [],
        evidence_videos=data.videos or [],
        created_at=datetime.utcnow()
    )
    db.add(return_request)
    db.commit()
    db.refresh(return_request)
    
    return {
        "message": "Return request submitted successfully",
        "return_id": return_request.id,
        "order_number": order.order_number,
        "status": "pending",
        "refund_amount": refund_amount,
        "review_timeline": "24 hours"
    }

@router.get("/{order_id}/returns")
def get_order_returns(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all return requests for an order"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user["id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    returns = db.query(models.ReturnRequest).filter(models.ReturnRequest.order_id == order_id).all()
    return returns

# Admin endpoints for orders
@router.get("/{order_id}/invoice")
def get_order_invoice(order_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get order invoice PDF"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check access (admin or owner)
    if user["role"] != "admin" and order.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # TODO: Generate PDF invoice
    return {"message": "Invoice generation - TODO: implement", "order_id": order_id}

@router.get("/{order_id}/shipping-label")
def get_shipping_label(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get shipping label PDF"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: Generate shipping label
    return {"message": "Shipping label generation - TODO: implement", "order_id": order_id}

@router.get("/{order_id}/packing-slip")
def get_packing_slip(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get packing slip PDF"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: Generate packing slip
    return {"message": "Packing slip generation - TODO: implement", "order_id": order_id}

@router.get("/{order_id}/label")
def get_order_label(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get order label PDF"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: Generate order label
    return {"message": "Order label generation - TODO: implement", "order_id": order_id}