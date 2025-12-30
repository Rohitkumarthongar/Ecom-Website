"""
Order endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app import models

router = APIRouter()

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