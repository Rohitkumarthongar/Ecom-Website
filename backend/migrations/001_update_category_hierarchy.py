#!/usr/bin/env python3
"""
Database migration to update category hierarchy structure
This migration ensures existing categories work with the new hierarchical system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import get_db_url
from app import models

def run_migration():
    """Run the category hierarchy migration"""
    print("Starting category hierarchy migration...")
    
    # Create database connection
    engine = create_engine(get_db_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if categories table exists and has the required columns
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'categories' 
            AND TABLE_SCHEMA = DATABASE()
        """))
        
        columns = [row[0] for row in result.fetchall()]
        print(f"Found columns in categories table: {columns}")
        
        # Check if parent_id column exists
        if 'parent_id' not in columns:
            print("Adding parent_id column to categories table...")
            db.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN parent_id VARCHAR(36) NULL,
                ADD FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            """))
            db.commit()
            print("✓ Added parent_id column")
        else:
            print("✓ parent_id column already exists")
        
        # Verify the foreign key constraint exists
        result = db.execute(text("""
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'categories' 
            AND COLUMN_NAME = 'parent_id'
            AND REFERENCED_TABLE_NAME = 'categories'
            AND TABLE_SCHEMA = DATABASE()
        """))
        
        constraints = result.fetchall()
        if not constraints:
            print("Adding foreign key constraint for parent_id...")
            try:
                db.execute(text("""
                    ALTER TABLE categories 
                    ADD CONSTRAINT fk_categories_parent_id 
                    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
                """))
                db.commit()
                print("✓ Added foreign key constraint")
            except Exception as e:
                print(f"Note: Foreign key constraint may already exist: {e}")
        else:
            print("✓ Foreign key constraint already exists")
        
        # Count existing categories
        result = db.execute(text("SELECT COUNT(*) FROM categories"))
        category_count = result.fetchone()[0]
        print(f"Found {category_count} existing categories")
        
        # Validate existing data
        if category_count > 0:
            # Check for any invalid parent_id references
            result = db.execute(text("""
                SELECT c1.id, c1.name, c1.parent_id 
                FROM categories c1 
                LEFT JOIN categories c2 ON c1.parent_id = c2.id 
                WHERE c1.parent_id IS NOT NULL AND c2.id IS NULL
            """))
            
            invalid_refs = result.fetchall()
            if invalid_refs:
                print(f"Found {len(invalid_refs)} categories with invalid parent references:")
                for cat_id, name, parent_id in invalid_refs:
                    print(f"  - {name} (ID: {cat_id}) -> Invalid parent: {parent_id}")
                
                # Fix invalid references by setting them to NULL
                print("Fixing invalid parent references...")
                db.execute(text("""
                    UPDATE categories 
                    SET parent_id = NULL 
                    WHERE parent_id NOT IN (SELECT id FROM (SELECT id FROM categories) AS temp)
                """))
                db.commit()
                print("✓ Fixed invalid parent references")
            else:
                print("✓ All parent references are valid")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()