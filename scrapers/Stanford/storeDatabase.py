import json
import psycopg2
from psycopg2.extras import execute_batch  # for efficient bulk operations
import os

JSON_FILE = r"C:\Users\Bubble\Desktop\001 Blockchain\edulink\scrapers\Stanford\data\scraped\AllDepts_Got55.json"

# Tables: schools, departments, courses
DB_PARAMS = {
    'dbname': 'edulink',
    'user': 'postgres',
    'password': 'rockfish0920',
    'host': 'localhost',
    'port': '5432'
}

def createTables():
    commands = [
        # Drop tables in order using CASCADE to remove dependencies
        "DROP TABLE IF EXISTS courses CASCADE;",
        "DROP TABLE IF EXISTS departments CASCADE;",
        "DROP TABLE IF EXISTS schools CASCADE;",
        
        # Create tables in the correct order
        """
        CREATE TABLE IF NOT EXISTS schools (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            school_id INTEGER REFERENCES schools(id),
            name VARCHAR(255) UNIQUE,
            code VARCHAR(50) UNIQUE NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            department_id INTEGER REFERENCES departments(id),
            course_code VARCHAR(50) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,  -- Removed UNIQUE here
            description TEXT,
            instructors TEXT[],
            credits INTEGER,
            ipfs_materials_hash TEXT,
            blockchain_certificate_id bytea,
            UNIQUE(department_id, course_code)
        )

        """
    ]

    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        for command in commands:
            cur.execute(command)
        conn.commit()
        cur.close()
        print("[CREATED TABLES] Successfully created 3 tables!")
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error: {error}")
    finally:
        if conn is not None:
            conn.close()


def storeCourses(file=JSON_FILE):
    with open(file, "r") as f:
        courses = json.load(f)

    conn = None

    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        for course in courses:
            # Derive department code from the course number
            dept_code = course['courseNumber'].split()[0]
            
            # Try to get department id; if not found, insert a new department
            cur.execute("SELECT id FROM departments WHERE code = %s", (dept_code,))
            dept_result = cur.fetchone()
            if dept_result is None:
                cur.execute(
                    "INSERT INTO departments (name, code) VALUES (%s, %s) RETURNING id", 
                    (dept_code, dept_code)
                )
                dept_row = cur.fetchone()
                if dept_row is None:
                    print(f"Failed to insert department: {dept_code}")
                    continue  # Skip this course if department insertion fails
                dept_id = dept_row[0]
            else:
                dept_id = dept_result[0]
            
            # Insert course into the courses table
            cur.execute(
                """
                INSERT INTO courses (department_id, course_code, title, description, instructors)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (course_code) DO NOTHING
                RETURNING id
                """,
                (dept_id, course['courseNumber'], course['courseName'], course['courseDescription'], course['instructors'])
            )

            # Safely check the returned row
            course_row = cur.fetchone()
            if course_row is None:
                print(f"[DUPLICATE or SKIPPED]: {course['courseNumber']} already exists or was not inserted.")
            else:
                course_id = course_row[0]
                print(f"[STORED COURSE]: {course['courseNumber']} stored with id {course_id}")
            
            # Consider committing after each insert or after processing all records
            conn.commit()
        
        print("[STORED COURSES] Successfully stored courses!")
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error: {error}")
        if conn:
            conn.rollback()  # rollback in case of error
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    createTables()
    storeCourses()