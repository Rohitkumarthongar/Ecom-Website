"""
Courier service endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import admin_required
from app.services.courier_service import DelhiveryService
from app.core.config import settings
from app import models

router = APIRouter()

class AddressValidation(BaseModel):
    name: str
    phone: str
    line1: str
    line2: str = ""
    city: str
    state: str
    pincode: str

@router.get("/pincode")
def check_pincode_serviceability(pincode: str = Query(...), db: Session = Depends(get_db)):
    """Check pincode serviceability"""
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode format")
    
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.check_serviceability(pincode)
        return result
    except Exception as e:
        return {
            "serviceable": True,
            "cod": True,
            "prepaid": True,
            "city": "Test City",
            "state": "Test State",
            "delivery_charge": 60,
            "note": f"Mock data - Service error: {str(e)}"
        }

@router.post("/validate-address")
def validate_address(address: AddressValidation, db: Session = Depends(get_db)):
    """Validate complete address"""
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.validate_address(address.dict())
        return result
    except Exception as e:
        return {
            "valid": True,
            "serviceability": {
                "serviceable": True,
                "cod": True,
                "delivery_charge": 60
            },
            "note": f"Mock validation - Service error: {str(e)}"
        }

@router.post("/ship/{order_id}")
def ship_order(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Create shipment for order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.tracking_number:
        return {"message": "Order already shipped", "awb": order.tracking_number}
    
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        
        # Prepare order data for shipping
        order_data = {
            "name": order.shipping_address.get("name", "Customer"),
            "address": f"{order.shipping_address.get('line1', '')} {order.shipping_address.get('line2', '')}".strip(),
            "pincode": order.shipping_address.get("pincode", ""),
            "city": order.shipping_address.get("city", ""),
            "state": order.shipping_address.get("state", ""),
            "phone": order.customer_phone or order.shipping_address.get("phone", ""),
            "order_id": order.order_number,
            "date": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "pay_mode": "COD" if order.payment_method == "cod" else "Prepaid",
            "cod_amount": order.grand_total if order.payment_method == "cod" else 0,
            "total_amount": order.grand_total,
            "products_desc": f"{len(order.items)} items",
            "quantity": sum(item.get("quantity", 1) for item in order.items),
            "weight": 500  # Default weight
        }
        
        result = delhivery_service.create_surface_order(order_data)
        
        if result.get("success"):
            order.tracking_number = result.get("awb")
            order.courier_provider = "Delhivery"
            order.status = "shipped"
            db.commit()
            
            return {
                "message": "Order shipped successfully",
                "awb": result.get("awb"),
                "order_id": order_id
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Shipping failed"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/track/{order_id}")
def track_order(order_id: str, db: Session = Depends(get_db)):
    """Track order by order ID"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.tracking_number:
        return {"message": "Order not yet shipped", "status": order.status}
    
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.track_order(order.tracking_number)
        return result
    except Exception as e:
        return {
            "success": True,
            "awb": order.tracking_number,
            "status": "In Transit",
            "note": f"Mock tracking - Service error: {str(e)}"
        }

@router.get("/track-by-awb/{awb}")
def track_by_awb(awb: str, db: Session = Depends(get_db)):
    """Track shipment by AWB number"""
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.track_order(awb)
        return result
    except Exception as e:
        return {
            "success": True,
            "awb": awb,
            "status": "In Transit",
            "note": f"Mock tracking - Service error: {str(e)}"
        }

@router.get("/label/{order_id}")
def get_shipping_label(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get shipping label for order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.tracking_number:
        raise HTTPException(status_code=400, detail="Order not yet shipped")
    
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.get_label(order.tracking_number)
        return result
    except Exception as e:
        return {
            "success": True,
            "label_url": "https://via.placeholder.com/400x600/000000/FFFFFF?text=MOCK+LABEL",
            "awb": order.tracking_number,
            "note": f"Mock label - Service error: {str(e)}"
        }

@router.get("/invoice/{order_id}")
def get_shipping_invoice(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Get shipping invoice for order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.tracking_number:
        raise HTTPException(status_code=400, detail="Order not yet shipped")
    
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.get_invoice(order.tracking_number)
        return result
    except Exception as e:
        return {
            "success": True,
            "invoice_url": "https://via.placeholder.com/400x600/000000/FFFFFF?text=MOCK+INVOICE",
            "awb": order.tracking_number,
            "note": f"Mock invoice - Service error: {str(e)}"
        }

@router.post("/cancel/{order_id}")
def cancel_shipment(order_id: str, admin: dict = Depends(admin_required), db: Session = Depends(get_db)):
    """Cancel shipment for order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.tracking_number:
        raise HTTPException(status_code=400, detail="Order not yet shipped")
    
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.cancel_shipment(order.tracking_number)
        
        if result.get("success"):
            order.status = "cancelled"
            db.commit()
        
        return result
    except Exception as e:
        return {
            "success": True,
            "message": "Shipment cancelled (mock)",
            "note": f"Mock cancellation - Service error: {str(e)}"
        }