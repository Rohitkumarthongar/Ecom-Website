#!/usr/bin/env python3
"""
Simple database connection test
"""

import os
import sqlite3
from pathlib import Path

def check_sqlite():
    """Check SQLite database"""
    print("=== SQLite Database Check ===")
    
    db_path = Path("local_db.sqlite")
    
    if not db_path.exists():
        print("❌ SQLite database file doesn't exist")
        print(f"Expected location: {db_path.absolute()}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if we can query
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"✅ SQLite connection successful")
        print(f"Database file: {db_path.absolute()}")
        print(f"File size: {db_path.stat().st_size} bytes")
        print(f"Tables found: {len(tables)}")
        
        if tables:
            print("Tables:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("No tables found - database needs initialization")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ SQLite connection failed: {e}")
        return False

def check_mysql():
    """Check MySQL connection"""
    print("\n=== MySQL Database Check ===")
    
    try:
        import pymysql
        
        # Read config from .env
        config = {}
        env_path = Path(".env")
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        key, value = line.strip().split("=", 1)
                        config[key] = value
        
        if not config.get("DB_HOST"):
            print("❌ MySQL config not found in .env")
            return False
        
        print(f"Host: {config.get('DB_HOST')}")
        print(f"Port: {config.get('DB_PORT')}")
        print(f"Database: {config.get('DB_NAME')}")
        print(f"User: {config.get('DB_USER')}")
        
        # Try to connect
        conn = pymysql.connect(
            host=config.get("DB_HOST"),
            port=int(config.get("DB_PORT", 3306)),
            user=config.get("DB_USER"),
            password=config.get("DB_PASSWORD"),
            database=config.get("DB_NAME")
        )
        
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        print(f"✅ MySQL connection successful")
        print(f"Tables found: {len(tables)}")
        
        if tables:
            print("Tables:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("No tables found - database needs initialization")
        
        conn.close()
        return True
        
    except ImportError:
        print("❌ PyMySQL not installed")
        return False
    except Exception as e:
        print(f"❌ MySQL connection failed: {e}")
        return False

def main():
    """Main check function"""
    print("Database Connection Check")
    print("=" * 40)
    
    # Check .env file
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env file not found")
        return
    
    # Read USE_SQLITE setting
    use_sqlite = True
    with open(env_path) as f:
        for line in f:
            if line.startswith("USE_SQLITE="):
                use_sqlite = line.split("=")[1].strip().lower() == "true"
                break
    
    print(f"USE_SQLITE setting: {use_sqlite}")
    
    if use_sqlite:
        success = check_sqlite()
        if not success:
            print("\n💡 To create SQLite database, run: python setup_database.py")
    else:
        success = check_mysql()
        if not success:
            print("\n💡 Check MySQL server is running and credentials are correct")
            print("💡 Or set USE_SQLITE=True in .env to use SQLite instead")

if __name__ == "__main__":
    main()