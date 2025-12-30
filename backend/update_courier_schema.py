import sqlite3
import os

def upgrade_db():
    db_path = "local_db.sqlite"
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns = [
        ("api_secret", "VARCHAR(100)"),
        ("webhook_url", "VARCHAR(200)"),
        ("tracking_url_template", "VARCHAR(500)")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE couriers ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db()
