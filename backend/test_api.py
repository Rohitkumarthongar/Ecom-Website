#!/usr/bin/env python3
"""
Test API functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all imports work"""
    try:
        print("Testing imports...")
        
        from app.core.config import settings
        print("✅ Config imported")
        
        from app.core.database import engine, SessionLocal
        print("✅ Database imported")
        
        from app import models
        print("✅ Models imported")
        
        from app.routers import categories, admin
        print("✅ Routers imported")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    try:
        print("\nTesting database connection...")
        
        from app.core.database import SessionLocal
        from app import models
        
        db = SessionLocal()
        
        # Test simple query
        categories = db.query(models.Category).limit(5).all()
        print(f"✅ Database query successful - found {len(categories)} categories")
        
        # Test if we can create a category
        test_category = models.Category(
            name="Test Category",
            description="Test description"
        )
        db.add(test_category)
        db.commit()
        db.refresh(test_category)
        
        print(f"✅ Category created with ID: {test_category.id}")
        
        # Clean up - delete the test category
        db.delete(test_category)
        db.commit()
        print("✅ Test category cleaned up")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_hierarchical_categories():
    """Test hierarchical category functionality"""
    try:
        print("\nTesting hierarchical categories...")
        
        from app.core.database import SessionLocal
        from app import models
        
        db = SessionLocal()
        
        # Create parent category
        parent = models.Category(
            name="Test Parent",
            description="Parent category for testing"
        )
        db.add(parent)
        db.commit()
        db.refresh(parent)
        
        # Create child category
        child = models.Category(
            name="Test Child",
            description="Child category for testing",
            parent_id=parent.id
        )
        db.add(child)
        db.commit()
        db.refresh(child)
        
        print(f"✅ Parent category: {parent.name} (Level: {parent.level})")
        print(f"✅ Child category: {child.name} (Level: {child.level})")
        print(f"✅ Child full path: {child.full_path}")
        
        # Test relationships
        print(f"✅ Parent has {len(parent.children)} children")
        print(f"✅ Child parent: {child.parent.name if child.parent else 'None'}")
        
        # Clean up
        db.delete(child)
        db.delete(parent)
        db.commit()
        print("✅ Test categories cleaned up")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Hierarchical category test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("API Functionality Test")
    print("=" * 40)
    
    success = True
    
    if not test_imports():
        success = False
    
    if not test_database_connection():
        success = False
    
    if not test_hierarchical_categories():
        success = False
    
    if success:
        print("\n🎉 All tests passed! The API should work correctly.")
    else:
        print("\n❌ Some tests failed. Check the errors above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)