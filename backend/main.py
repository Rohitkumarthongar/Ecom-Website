"""
FastAPI Main Application Entry Point
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging

from app.core.config import settings
from app.core.database import engine
from app import models
from app.routers import auth, users, products, categories, orders, admin, uploads, notifications, banners, offers, utils

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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
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
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )