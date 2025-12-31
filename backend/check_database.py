#!/usr/bin/env python3
"""
Database status checker
Checks database connection and table status
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings
from app.core.database import Base
from app import models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_database_status():
    """Check database connection and table status"""
    logger.info("=== Database Status Check ===")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database URL: {settings.database_url}")
    logger.info(f"Using SQLite: {settings.USE_SQLITE}")
    
    try:
        # Create engine
        engine = create_engine(settings.database_url, **{"connect_args": settings.database_connect_args})
        
        # Test connection
        with engine.connect() as conn:
            if settings.USE_SQLITE:
                result = conn.execute(text("SELECT 1"))
                logger.info("✓ SQLite database connection successful")
            else:
                result = conn.execute(text("SELECT 1"))
                logger.info("✓ MySQL database connection successful")
        
        # Check tables
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        logger.info(f"\nExisting tables ({len(existing_tables)}):")
        for table in existing_tables:
            logger.info(f"  - {table}")
        
        # Check expected tables
        expected_tables = [
            'users', 'categories', 'products', 'orders', 'order_items',
            'banners', 'offers', 'settings', 'notifications', 'pages',
            'couriers', 'payment_gateways', 'warehouses', 'inventory',
            'returns', 'cancellations', 'seller_requests', 'wishlist_items',
            'wishlist_categories'
        ]
        
        missing_tables = [table for table in expected_tables if table not in existing_tables]
        
        if missing_tables:
            logger.warning(f"\nMissing tables ({len(missing_tables)}):")
            for table in missing_tables:
                logger.warning(f"  - {table}")
        else:
            logger.info("\n✓ All expected tables exist")
        
        # Check for data
        if 'users' in existing_tables:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM users"))
                user_count = result.fetchone()[0]
                logger.info(f"\nUsers in database: {user_count}")
                
                if user_count > 0:
                    result = conn.execute(text("SELECT email, role FROM users LIMIT 5"))
                    users = result.fetchall()
                    logger.info("Sample users:")
                    for email, role in users:
                        logger.info(f"  - {email} ({role})")
        
        if 'categories' in existing_tables:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM categories"))
                category_count = result.fetchone()[0]
                logger.info(f"Categories in database: {category_count}")
        
        if 'products' in existing_tables:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM products"))
                product_count = result.fetchone()[0]
                logger.info(f"Products in database: {product_count}")
        
        logger.info("\n=== Status Check Complete ===")
        return True
        
    except Exception as e:
        logger.error(f"✗ Database check failed: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        
        # Provide specific help based on error
        if "No such file or directory" in str(e):
            logger.info("\n💡 SQLite database file doesn't exist. Run setup_database.py to create it.")
        elif "Access denied" in str(e):
            logger.info("\n💡 MySQL access denied. Check your credentials in .env file.")
        elif "Can't connect to MySQL server" in str(e):
            logger.info("\n💡 MySQL server not running or wrong host/port. Check MySQL service.")
        elif "Unknown database" in str(e):
            logger.info("\n💡 MySQL database doesn't exist. Create it first or use SQLite.")
        
        return False

if __name__ == "__main__":
    success = check_database_status()
    if not success:
        sys.exit(1)