#!/usr/bin/env python3
"""
Test script for hierarchical categories
Creates sample hierarchical categories to test the new structure
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from app.core.database import engine
from app import models

def create_sample_categories():
    """Create sample hierarchical categories"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Creating sample hierarchical categories...")
        
        # Create root categories
        electronics = models.Category(
            name="Electronics",
            description="Electronic devices and accessories"
        )
        db.add(electronics)
        db.flush()  # Get the ID
        
        clothing = models.Category(
            name="Clothing",
            description="Apparel and fashion items"
        )
        db.add(clothing)
        db.flush()
        
        # Create level 1 subcategories under Electronics
        mobile = models.Category(
            name="Mobile Phones",
            description="Smartphones and feature phones",
            parent_id=electronics.id
        )
        db.add(mobile)
        db.flush()
        
        computers = models.Category(
            name="Computers",
            description="Laptops, desktops, and accessories",
            parent_id=electronics.id
        )
        db.add(computers)
        db.flush()
        
        # Create level 2 subcategories under Mobile Phones
        smartphones = models.Category(
            name="Smartphones",
            description="Android and iOS smartphones",
            parent_id=mobile.id
        )
        db.add(smartphones)
        db.flush()
        
        accessories = models.Category(
            name="Mobile Accessories",
            description="Cases, chargers, and other accessories",
            parent_id=mobile.id
        )
        db.add(accessories)
        db.flush()
        
        # Create level 3 subcategories under Smartphones
        android = models.Category(
            name="Android Phones",
            description="Android-based smartphones",
            parent_id=smartphones.id
        )
        db.add(android)
        
        iphone = models.Category(
            name="iPhones",
            description="Apple iPhone series",
            parent_id=smartphones.id
        )
        db.add(iphone)
        
        # Create level 1 subcategories under Clothing
        mens = models.Category(
            name="Men's Clothing",
            description="Clothing for men",
            parent_id=clothing.id
        )
        db.add(mens)
        db.flush()
        
        womens = models.Category(
            name="Women's Clothing",
            description="Clothing for women",
            parent_id=clothing.id
        )
        db.add(womens)
        db.flush()
        
        # Create level 2 subcategories under Men's Clothing
        mens_shirts = models.Category(
            name="Shirts",
            description="Men's shirts and t-shirts",
            parent_id=mens.id
        )
        db.add(mens_shirts)
        
        mens_pants = models.Category(
            name="Pants",
            description="Men's pants and jeans",
            parent_id=mens.id
        )
        db.add(mens_pants)
        
        db.commit()
        
        print("✓ Sample categories created successfully!")
        
        # Display the hierarchy
        print("\nCreated hierarchy:")
        root_categories = db.query(models.Category).filter(models.Category.parent_id.is_(None)).all()
        
        def print_category_tree(categories, level=0):
            for cat in categories:
                indent = "  " * level
                print(f"{indent}- {cat.name} (Level {cat.level})")
                print(f"{indent}  Path: {cat.full_path}")
                if cat.children:
                    print_category_tree(cat.children, level + 1)
        
        print_category_tree(root_categories)
        
    except Exception as e:
        print(f"Error creating sample categories: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_categories()