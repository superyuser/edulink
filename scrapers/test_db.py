import psycopg2
from initialize_database import setup_database

setup_database()

def test_db_connection():
    """Test PostgreSQL connection and data insertion"""
    
    # Test data
    test_department = ("Computer Science", "https://ocw.mit.edu/search/?d=Computer%20Science")
    test_course = ("Introduction to Python", "https://ocw.mit.edu/courses/python-101")
    test_details = {
        'name': "Introduction to Python",
        'description': "Learn Python basics",
        'prerequisites': "None",
        'syllabus_url': "https://ocw.mit.edu/courses/python-101/syllabus",
        'course_materials_url': "https://ocw.mit.edu/courses/python-101/materials",
        'assignments_url': "https://ocw.mit.edu/courses/python-101/assignments"
    }
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            dbname="edulink",
            user="postgres",
            password="rockfish0920",
            host="localhost",
            client_encoding='utf8'
        )
        cur = conn.cursor()
        
        # Drop existing tables in reverse order
        print("Dropping existing tables...")
        cur.execute("""
            DROP TABLE IF EXISTS course_details CASCADE;
            DROP TABLE IF EXISTS courses CASCADE;
            DROP TABLE IF EXISTS departments CASCADE;
        """)
        
        # Create tables in correct order
        print("Creating tables...")
        cur.execute("""
            CREATE TABLE departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) UNIQUE,
                url VARCHAR(500)
            );

            CREATE TABLE courses (
                id SERIAL PRIMARY KEY,
                department_id INTEGER REFERENCES departments(id),
                name VARCHAR(200),
                url VARCHAR(500),
                UNIQUE(department_id, url)
            );

            CREATE TABLE course_details (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id),
                name VARCHAR(200),
                description TEXT,
                prerequisites TEXT,
                syllabus_url VARCHAR(500),
                course_materials_url VARCHAR(500),
                assignments_url VARCHAR(500),
                UNIQUE(course_id)
            );
        """)
        conn.commit()
        
        # Insert test department
        print("\nInserting test department...")
        cur.execute("""
            INSERT INTO departments (name, url)
            VALUES (%s, %s)
            ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url
            RETURNING id
        """, test_department)
        dept_id = cur.fetchone()[0]
        print(f"Department ID: {dept_id}")
        
        # Insert test course
        print("\nInserting test course...")
        cur.execute("""
            INSERT INTO courses (department_id, name, url)
            VALUES (%s, %s, %s)
            ON CONFLICT (department_id, url) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (dept_id, *test_course))
        course_id = cur.fetchone()[0]
        print(f"Course ID: {course_id}")
        
        # Insert test course details
        print("\nInserting test course details...")
        cur.execute("""
            INSERT INTO course_details (
                course_id, name, description, prerequisites,
                syllabus_url, course_materials_url, assignments_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (course_id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                prerequisites = EXCLUDED.prerequisites,
                syllabus_url = EXCLUDED.syllabus_url,
                course_materials_url = EXCLUDED.course_materials_url,
                assignments_url = EXCLUDED.assignments_url
        """, (
            course_id,
            test_details['name'],
            test_details['description'],
            test_details['prerequisites'],
            test_details['syllabus_url'],
            test_details['course_materials_url'],
            test_details['assignments_url']
        ))
        
        # Verify data
        print("\nVerifying inserted data...")
        cur.execute("""
            SELECT d.name, c.name, cd.description
            FROM departments d
            JOIN courses c ON c.department_id = d.id
            JOIN course_details cd ON cd.course_id = c.id
            WHERE d.id = %s
        """, (dept_id,))
        
        result = cur.fetchone()
        print(f"Department: {result[0]}")
        print(f"Course: {result[1]}")
        print(f"Description: {result[2]}")
        
        # Commit changes
        conn.commit()
        print("\nTest completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test_db_connection()