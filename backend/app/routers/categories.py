"""
Category endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app import models

router = APIRouter()

def build_category_tree(categories: List[models.Category]) -> List[Dict[str, Any]]:
    """Build hierarchical category tree from flat list"""
    category_dict = {cat.id: {
        "id": cat.id,
        "name": cat.name,
        "description": cat.description,
        "image_url": cat.image_url,
        "parent_id": cat.parent_id,
        "is_active": cat.is_active,
        "created_at": cat.created_at,
        "level": cat.level,
        "full_path": cat.full_path,
        "children": []
    } for cat in categories}
    
    tree = []
    for cat_data in category_dict.values():
        if cat_data["parent_id"]:
            parent = category_dict.get(cat_data["parent_id"])
            if parent:
                parent["children"].append(cat_data)
        else:
            tree.append(cat_data)
    
    return tree

def flatten_category_tree(tree: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Flatten hierarchical tree to a list with level indicators"""
    flat_list = []
    
    def add_to_list(categories, level=0):
        for cat in categories:
            cat_copy = cat.copy()
            cat_copy["level"] = level
            cat_copy["has_children"] = len(cat["children"]) > 0
            children = cat_copy.pop("children", [])
            flat_list.append(cat_copy)
            if children:
                add_to_list(children, level + 1)
    
    add_to_list(tree)
    return flat_list

@router.get("/")
def get_categories(
    flat: bool = Query(False, description="Return flat list instead of tree"),
    parent_id: Optional[str] = Query(None, description="Filter by parent category"),
    db: Session = Depends(get_db)
):
    """Get all active categories as tree or flat list"""
    query = db.query(models.Category).filter(models.Category.is_active == True)
    
    if parent_id is not None:
        if parent_id == "":  # Root categories only
            query = query.filter(models.Category.parent_id.is_(None))
        else:
            query = query.filter(models.Category.parent_id == parent_id)
    
    categories = query.all()
    
    if flat or parent_id is not None:
        return [
            {
                "id": cat.id,
                "name": cat.name,
                "description": cat.description,
                "image_url": cat.image_url,
                "parent_id": cat.parent_id,
                "is_active": cat.is_active,
                "created_at": cat.created_at,
                "level": cat.level,
                "full_path": cat.full_path,
                "has_children": len(cat.children) > 0
            }
            for cat in categories
        ]
    
    # Return hierarchical tree
    tree = build_category_tree(categories)
    return tree

@router.get("/flat")
def get_categories_flat(db: Session = Depends(get_db)):
    """Get all categories as a flat list with hierarchy information"""
    categories = db.query(models.Category).filter(models.Category.is_active == True).all()
    tree = build_category_tree(categories)
    return flatten_category_tree(tree)

@router.get("/tree")
def get_categories_tree(db: Session = Depends(get_db)):
    """Get categories as hierarchical tree"""
    categories = db.query(models.Category).filter(models.Category.is_active == True).all()
    return build_category_tree(categories)

@router.get("/{category_id}")
def get_category(category_id: str, db: Session = Depends(get_db)):
    """Get single category by ID with hierarchy info"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "image_url": category.image_url,
        "parent_id": category.parent_id,
        "is_active": category.is_active,
        "created_at": category.created_at,
        "level": category.level,
        "full_path": category.full_path,
        "parent": {
            "id": category.parent.id,
            "name": category.parent.name,
            "full_path": category.parent.full_path
        } if category.parent else None,
        "children": [
            {
                "id": child.id,
                "name": child.name,
                "full_path": child.full_path,
                "has_children": len(child.children) > 0
            }
            for child in category.children
        ]
    }

@router.get("/{category_id}/children")
def get_category_children(
    category_id: str,
    recursive: bool = Query(False, description="Include all descendants"),
    db: Session = Depends(get_db)
):
    """Get children of a specific category"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if recursive:
        children = category.get_all_children()
    else:
        children = category.children
    
    return [
        {
            "id": child.id,
            "name": child.name,
            "description": child.description,
            "image_url": child.image_url,
            "parent_id": child.parent_id,
            "is_active": child.is_active,
            "level": child.level,
            "full_path": child.full_path,
            "has_children": len(child.children) > 0
        }
        for child in children
    ]

@router.get("/{category_id}/path")
def get_category_path(category_id: str, db: Session = Depends(get_db)):
    """Get the full path from root to this category"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    path = []
    current = category
    while current:
        path.insert(0, {
            "id": current.id,
            "name": current.name,
            "level": current.level
        })
        current = current.parent
        if len(path) > 10:  # Prevent infinite loops
            break
    
    return {"path": path, "full_path": category.full_path}