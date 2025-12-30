"""
Utility endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class PincodeVerify(BaseModel):
    pincode: str

@router.post("/verify-pincode")
def verify_pincode(data: PincodeVerify):
    """Verify pincode serviceability"""
    pincode = data.pincode
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode format")
    
    # TODO: Implement pincode verification logic using courier service
    return {"serviceable": True, "message": "Pincode verification - TODO: implement"}