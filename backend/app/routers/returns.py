"""
Returns management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, admin_required
from app import models

router = APIRouter()

@router.get("/")
def get_user_returns(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's return requests"""
    returns = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.user_id == user["id"]
    ).order_by(models.ReturnRequest.created_at.desc()).all()
    
    # Enrich with order information
    enriched_returns = []
    for return_req in returns:
        order = db.query(models.Order).filter(models.Order.id == return_req.order_id).first()
        return_dict = {
            "id": return_req.id,
            "order_id": return_req.order_id,
            "user_id": return_req.user_id,
            "items": return_req.items,
            "reason": return_req.reason,
            "return_type": return_req.return_type,
            "refund_method": return_req.refund_method,
            "status": return_req.status,
            "refund_amount": return_req.refund_amount,
            "notes": return_req.notes,
            "evidence_images": return_req.evidence_images,
            "evidence_videos": return_req.evidence_videos,
            "return_awb": return_req.return_awb,
            "courier_provider": return_req.courier_provider,
            "created_at": return_req.created_at,
            "updated_at": return_req.updated_at,
            "order_number": order.order_number if order else "Unknown",
            "order_date": order.created_at.isoformat() if order and order.created_at else None
        }
        enriched_returns.append(return_dict)
    
    return enriched_returns

@router.get("/{return_id}")
def get_return_by_id(return_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get return request by ID"""
    return_req = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.id == return_id,
        models.ReturnRequest.user_id == user["id"]
    ).first()
    
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    return return_req

@router.post("/{return_id}/evidence")
def upload_return_evidence(
    return_id: str,
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload evidence files for return request"""
    return_req = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.id == return_id,
        models.ReturnRequest.user_id == user["id"]
    ).first()
    
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    # TODO: Implement file upload logic
    # For now, just return success
    return {
        "message": f"Uploaded {len(files)} evidence files",
        "files": [{"filename": f.filename, "url": f"/uploads/evidence/{f.filename}"} for f in files]
    }

@router.get("/{return_id}/tracking")
def track_return(return_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Track return shipment"""
    return_req = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.id == return_id,
        models.ReturnRequest.user_id == user["id"]
    ).first()
    
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    if not return_req.return_awb:
        return {"message": "Return pickup not yet scheduled", "status": return_req.status}
    
    # TODO: Implement return tracking
    return {
        "awb": return_req.return_awb,
        "status": "In Transit",
        "tracking_history": [
            {
                "date": datetime.now().isoformat(),
                "status": "Pickup Scheduled",
                "location": "Customer Address"
            }
        ]
    }