import psycopg2

def setup_database():
    """Create database if it doesn't exist"""
    
    try:
        # First connect to default 'postgres' database
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="rockfish0920",
            host="localhost",
            client_encoding='utf8'
        )
        conn.autocommit = True  # Required for database creation
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'edulink'")
        exists = cur.fetchone()
        
        if not exists:
            print("Creating database 'edulink'...")
            cur.execute("CREATE DATABASE edulink WITH ENCODING 'UTF8'")
            print("Database created successfully!")
        else:
            print("Database 'edulink' already exists")
            
    except Exception as e:
        print(f"Error setting up database: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()