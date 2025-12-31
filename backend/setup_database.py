#!/usr/bin/env python3
"""
Database setup script
Creates all tables and initializes the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import Base
from app import models  # Import all models
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test database connection"""
    try:
        engine = create_engine(settings.database_url, **{"connect_args": settings.database_connect_args})
        
        # Test connection
        with engine.connect() as conn:
            if settings.USE_SQLITE:
                result = conn.execute(text("SELECT 1"))
                logger.info("✓ SQLite database connection successful")
            else:
                result = conn.execute(text("SELECT 1"))
                logger.info("✓ MySQL database connection successful")
        
        return engine
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        return None

def create_tables(engine):
    """Create all database tables"""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✓ All tables created successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to create tables: {e}")
        return False

def create_admin_user():
    """Create default admin user"""
    try:
        from app.core.database import SessionLocal
        from app.core.security import hash_password
        from app.core.utils import generate_id
        
        db = SessionLocal()
        
        # Check if admin already exists
        admin = db.query(models.User).filter(models.User.email == "admin@bharatbazaar.com").first()
        if admin:
            logger.info("✓ Admin user already exists")
            db.close()
            return
        
        # Create admin user
        admin_user = models.User(
            id=generate_id(),
            name="Admin User",
            email="admin@bharatbazaar.com",
            phone="9999999999",
            password=hash_password("admin123"),
            role="admin",
            is_verified=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        logger.info("✓ Admin user created successfully")
        logger.info("  Email: admin@bharatbazaar.com")
        logger.info("  Password: admin123")
        
        db.close()
        
    except Exception as e:
        logger.error(f"✗ Failed to create admin user: {e}")

def setup_database():
    """Main setup function"""
    logger.info("=== Database Setup ===")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database URL: {settings.database_url}")
    logger.info(f"Using SQLite: {settings.USE_SQLITE}")
    
    # Test connection
    engine = test_database_connection()
    if not engine:
        logger.error("Cannot proceed without database connection")
        return False
    
    # Create tables
    if not create_tables(engine):
        logger.error("Cannot proceed without tables")
        return False
    
    # Create admin user
    create_admin_user()
    
    logger.info("=== Setup Complete ===")
    return True

if __name__ == "__main__":
    success = setup_database()
    if not success:
        sys.exit(1)