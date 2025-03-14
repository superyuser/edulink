import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from typing import Optional

# Database configuration
DB_CONFIG = {
    'dbname': 'edulink',
    'user': 'postgres',
    'password': 'rockfish0920',
    'host': 'localhost',
    'port': '5432'
}

# Create a connection pool
MIN_CONNECTIONS = 1
MAX_CONNECTIONS = 10

try:
    connection_pool = SimpleConnectionPool(
        MIN_CONNECTIONS,
        MAX_CONNECTIONS,
        **DB_CONFIG
    )
except psycopg2.Error as e:
    print(f"Error creating connection pool: {e}")
    raise

class DatabaseError:
    """Database error messages"""
    CONNECTION_ERROR = "Failed to get database connection: {}"
    QUERY_ERROR = "Database query error: {}"
    POOL_ERROR = "Connection pool error: {}"

@contextmanager
def get_db_connection():
    """
    Context manager for database connections
    
    Yields:
        psycopg2.extensions.connection: Database connection from the pool
    """
    conn = None
    try:
        conn = connection_pool.getconn()
        yield conn
    except psycopg2.Error as e:
        print(DatabaseError.CONNECTION_ERROR.format(e))
        raise
    finally:
        if conn:
            connection_pool.putconn(conn)

@contextmanager
def get_db_cursor():
    """
    Context manager for database cursors
    
    Yields:
        psycopg2.extensions.cursor: Database cursor
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except psycopg2.Error as e:
            conn.rollback()
            print(DatabaseError.QUERY_ERROR.format(e))
            raise
        finally:
            cursor.close()

def test_connection() -> bool:
    """
    Test database connection
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT 1")
            return True
    except Exception as e:
        print(DatabaseError.CONNECTION_ERROR.format(e))
        return False