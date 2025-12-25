#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
import models
import bcrypt

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

db = next(get_db())
try:
    # Check all users with admin role
    admin_users = db.query(models.User).filter(models.User.role == 'admin').all()
    print(f'Found {len(admin_users)} admin users:')
    
    for admin in admin_users:
        print(f'  ID: {admin.id}')
        print(f'  Name: {admin.name}')
        print(f'  Phone: {admin.phone}')
        print(f'  Email: {admin.email}')
        print(f'  Role: {admin.role}')
        
        # Test password
        test_password = 'Rohit@123'
        is_valid = verify_password(test_password, admin.password)
        print(f'  Password valid for "{test_password}": {is_valid}')
        print('  ---')
        
    # Also check if there's a user with the phone number but different role
    user_by_phone = db.query(models.User).filter(models.User.phone == '8233189764').first()
    if user_by_phone:
        print(f'User with phone 8233189764:')
        print(f'  Name: {user_by_phone.name}')
        print(f'  Role: {user_by_phone.role}')
        is_valid = verify_password('Rohit@123', user_by_phone.password)
        print(f'  Password valid: {is_valid}')
    else:
        print('No user found with phone 8233189764')
        
finally:
    db.close()