"""
FastAPI Main Application Entry Point
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import logging

from app.core.config import settings
from app.core.database import engine, get_db
from app import models
from app.routers import auth, users, products, categories, orders, admin, uploads, notifications, banners, offers, utils, settings as settings_router, courier, pages, returns

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_application() -> FastAPI:
    """Create FastAPI application with all configurations"""
    
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="BharatBazaar E-commerce API",
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENVIRONMENT != "production" else None,
    )

    # Set up CORS
    cors_origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Create uploads directory
    UPLOAD_DIR = Path("uploads")
    UPLOAD_DIR.mkdir(exist_ok=True)

    # Mount static files for serving uploaded images
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    # Include API routers
    app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"])
    app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
    app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
    app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
    app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["orders"])
    app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
    app.include_router(uploads.router, prefix=f"{settings.API_V1_STR}/upload", tags=["uploads"])
    app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
    app.include_router(banners.router, prefix=f"{settings.API_V1_STR}/banners", tags=["banners"])
    app.include_router(offers.router, prefix=f"{settings.API_V1_STR}/offers", tags=["offers"])
    app.include_router(utils.router, prefix=f"{settings.API_V1_STR}/utils", tags=["utilities"])
    app.include_router(settings_router.router, prefix=f"{settings.API_V1_STR}/admin/settings", tags=["settings"])
    app.include_router(courier.router, prefix=f"{settings.API_V1_STR}/courier", tags=["courier"])
    app.include_router(pages.router, prefix=f"{settings.API_V1_STR}/pages", tags=["pages"])
    app.include_router(returns.router, prefix=f"{settings.API_V1_STR}/returns", tags=["returns"])
    
    # Public settings endpoint (no /admin prefix)
    from app.routers.settings import get_public_settings
    app.add_api_route(f"{settings.API_V1_STR}/settings/public", get_public_settings, methods=["GET"], tags=["public"])
    
    # Pincode verification endpoint (direct route)
    from app.routers.utils import verify_pincode
    app.add_api_route(f"{settings.API_V1_STR}/verify-pincode", verify_pincode, methods=["POST"], tags=["utilities"])
    
    # Contact form endpoint (direct route)
    from app.routers.pages import submit_contact_form
    app.add_api_route(f"{settings.API_V1_STR}/contact", submit_contact_form, methods=["POST"], tags=["contact"])
    
    # Product lookup endpoints
    @app.get(f"{settings.API_V1_STR}/products/lookup", tags=["products"])
    def product_lookup(sku: str = None, barcode: str = None, db: Session = Depends(get_db)):
        """Lookup product by SKU or barcode"""
        if sku:
            product = db.query(models.Product).filter(models.Product.sku == sku).first()
        elif barcode:
            product = db.query(models.Product).filter(models.Product.barcode == barcode).first()
        else:
            raise HTTPException(status_code=400, detail="SKU or barcode required")
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product
    
    # Payment QR generation
    @app.post(f"{settings.API_V1_STR}/generate-qr", tags=["payments"])
    def generate_payment_qr(data: dict):
        """Generate payment QR code"""
        # TODO: Implement QR code generation
        return {
            "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "amount": data.get("amount", 0),
            "customer_name": data.get("customer_name", "Customer"),
            "order_number": data.get("order_number", "")
        }

    # Create database tables
    models.Base.metadata.create_all(bind=engine)

    # Initialize data
    from app.core.init_db import init_db
    init_db()

    return app

app = create_application()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "BharatBazaar API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )