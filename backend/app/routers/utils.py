"""
Utility endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.courier_service import DelhiveryService
from app.core.config import settings

router = APIRouter()

class PincodeVerify(BaseModel):
    pincode: str

@router.post("/verify-pincode")
def verify_pincode(data: PincodeVerify):
    """Verify pincode serviceability"""
    pincode = data.pincode
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode format")
    
    # Use Delhivery service to check serviceability
    try:
        delhivery_service = DelhiveryService(settings.DELHIVERY_TOKEN or "")
        result = delhivery_service.check_serviceability(pincode)
        return result
    except Exception as e:
        # Return mock data if service fails
        return {
            "serviceable": True,
            "cod": True,
            "prepaid": True,
            "city": "Test City",
            "state": "Test State",
            "delivery_charge": 60,
            "note": f"Mock data - Service error: {str(e)}"
        }

# Add the route that frontend expects
@router.post("/verify-pincode", include_in_schema=False)
def verify_pincode_alt(data: PincodeVerify):
    """Alternative endpoint for pincode verification"""
    return verify_pincode(data)