"""
Database initialization
"""
import logging
from sqlalchemy.orm import Session
from .database import SessionLocal
from .security import hash_password
from app import models
from app.core.utils import generate_id

logger = logging.getLogger(__name__)

def init_db() -> None:
    """Initialize database with default data"""
    db = SessionLocal()
    try:
        create_initial_admin(db)
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
    finally:
        db.close()

def create_initial_admin(db: Session) -> None:
    """Create initial admin user"""
    admin_phone = "8233189764"
    admin = db.query(models.User).filter(models.User.phone == admin_phone).first()
    
    if not admin:
        new_admin = models.User(
            id=generate_id(),
            phone=admin_phone,
            name="Rohit",
            email="admin@bharatbazaar.com",
            password=hash_password("Rohit@123"),
            role="admin",
            is_seller=True,
            is_wholesale=True,
        )
        db.add(new_admin)
        db.commit()
        logger.info(f"Admin user {admin_phone} created.")
    else:
        # Update password to ensure it's correct
        admin.password = hash_password("Rohit@123")
        admin.role = "admin"
        admin.name = "Rohit"
        db.commit()
        logger.info(f"Admin user {admin_phone} updated/verified.")