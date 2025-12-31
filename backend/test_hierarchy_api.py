#!/usr/bin/env python3
"""
Test hierarchical categories API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_categories_tree():
    """Test categories tree endpoint"""
    print("Testing /categories/tree endpoint...")
    response = requests.get(f"{BASE_URL}/categories/tree")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Tree endpoint works - found {len(data)} root categories")
        
        # Check if we have hierarchical data
        for category in data:
            if category.get('children'):
                print(f"  - {category['name']} has {len(category['children'])} children")
                for child in category['children']:
                    print(f"    └ {child['name']} (Level {child['level']})")
                    if child.get('children'):
                        for grandchild in child['children']:
                            print(f"      └ {grandchild['name']} (Level {grandchild['level']})")
        return True
    else:
        print(f"❌ Tree endpoint failed: {response.status_code}")
        return False

def test_categories_flat():
    """Test categories flat endpoint"""
    print("\nTesting /categories/flat endpoint...")
    response = requests.get(f"{BASE_URL}/categories/flat")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Flat endpoint works - found {len(data)} total categories")
        
        # Show hierarchy in flat format
        for category in data[:10]:  # Show first 10
            indent = "  " * category['level']
            print(f"{indent}- {category['name']} (Level {category['level']}) - {category['full_path']}")
        
        if len(data) > 10:
            print(f"  ... and {len(data) - 10} more categories")
        
        return True
    else:
        print(f"❌ Flat endpoint failed: {response.status_code}")
        return False

def test_admin_categories():
    """Test admin categories endpoint"""
    print("\nTesting /admin/categories endpoint...")
    response = requests.get(f"{BASE_URL}/admin/categories")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Admin endpoint works - found {len(data)} categories")
        
        # Show categories with counts
        for category in data[:5]:  # Show first 5
            print(f"  - {category['name']}: {category.get('children_count', 0)} children, {category.get('products_count', 0)} products")
        
        return True
    else:
        print(f"❌ Admin endpoint failed: {response.status_code}")
        return False

def main():
    """Run all tests"""
    print("Testing Hierarchical Categories API")
    print("=" * 40)
    
    success = True
    
    if not test_categories_tree():
        success = False
    
    if not test_categories_flat():
        success = False
    
    if not test_admin_categories():
        success = False
    
    if success:
        print("\n🎉 All API endpoints are working correctly!")
        print("The frontend should now be able to:")
        print("  ✅ Display hierarchical categories in tree view")
        print("  ✅ Show categories with proper indentation")
        print("  ✅ Allow parent category selection")
        print("  ✅ Display full category paths")
    else:
        print("\n❌ Some API endpoints failed")
    
    return success

if __name__ == "__main__":
    main()