import os
import psycopg2
from psycopg2.extras import DictCursor
from backend.llm_interface import CourseRecommender
import json
import datetime

# Database connection parameters
DB_PARAMS = {
    'dbname': os.getenv('DB_NAME', 'edulink'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'rockfish0920'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

def setup_database():
    """Create the users table if it doesn't exist."""
    try:
        with psycopg2.connect(**DB_PARAMS) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_credits INTEGER DEFAULT 0,
                    completed_courses JSONB DEFAULT '[]'::jsonb,
                    interests JSONB DEFAULT '[]'::jsonb
                )
                """)
            conn.commit()
    except Exception as e:
        print(f"Database setup error: {e}")
        raise

def get_user(username: str):
    """Fetch a user by username."""
    try:
        with psycopg2.connect(**DB_PARAMS) as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE username = %s", (username,))
                row = cur.fetchone()
                return dict(row) if row else None
    except Exception as e:
        print(f"Error fetching user: {e}")
        return None

def create_user(username: str):
    """Create a new user and store it in the database."""
    try:
        with psycopg2.connect(**DB_PARAMS) as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute("""
                INSERT INTO users (username)
                VALUES (%s)
                RETURNING *
                """, (username,))
                user = dict(cur.fetchone())
            conn.commit()
            return user
    except Exception as e:
        print(f"Error creating user: {e}")
        return None

def main():
    # Ensure the users table exists.
    setup_database()
    
    # Ask for user's name and store/retrieve it in the database.
    username = input("Enter your name or nickname: ").strip()
    user = get_user(username)
    if not user:
        print("New user detected! Creating your profile...")
        user = create_user(username)
        if not user:
            print("Failed to create user profile. Exiting.")
            return
    print(f"Welcome, {username}!")
    
    # Ask the user what they want to learn about.
    query = input("What would you like to learn about? ").strip()
    print(f"\nGetting recommendations for query: {query}\n")
    
    # Use the CourseRecommender to get recommendations.
    recommender = CourseRecommender()
    results = recommender.get_recommendations(query)
    
    if "error" in results:
        print("Error:", results["error"])
    else:
        print("\nFound departments:", results["departments"])
        print("\nTotal courses found:", results["total_results"])
        print("\nRecommended Courses:")
        for course in results["courses"]:
            print(f"\nTitle: {course['title']}")
            print(f"Code: {course['course_code']}")
            print(f"Department: {course['department_name']} ({course['department_code']})")
            instructors = course.get("instructors")
            if instructors:
                print(f"Instructors: {', '.join(instructors)}")
            else:
                print("Instructors: None")
            print(f"Description: {course['description']}")

if __name__ == "__main__":
    main()
