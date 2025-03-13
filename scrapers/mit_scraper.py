from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from mit_helper.courses_given_departments import get_courses, get_course_details, get_departments_url
import psycopg2
from psycopg2.extras import execute_values
import time
import os

class MITCourseScraper:
    def __init__(self):
        # Setup Chrome options
        self.chrome_options = Options()
        # self.chrome_options.add_argument('--headless')  # Uncomment to run headless
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')
        
        # Setup WebDriver
        self.service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=self.service, options=self.chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        
        # Database connection
        self.conn = psycopg2.connect(
            dbname="edulink",
            user="postgres",
            password="rockfish0920",
            host="localhost"
        )
        self.cur = self.conn.cursor()
        self.setup_database()

    def setup_database(self):
        # Create departments table
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) UNIQUE,
                url VARCHAR(500)
            )
        """)
        
        # Create courses table with department reference
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                department_id INTEGER REFERENCES departments(id),
                name VARCHAR(200),
                url VARCHAR(500),
                UNIQUE(department_id, url)
            )
        """)
        
        # Create course_details table
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS course_details (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id),
                name VARCHAR(200),
                description TEXT,
                prerequisites TEXT,
                syllabus_url VARCHAR(500),
                course_materials_url VARCHAR(500),
                assignments_url VARCHAR(500),
                UNIQUE(course_id)
            )
        """)
        
        self.conn.commit()

    def obtain_departments(self):
        print("Getting departments from MIT OCW...")
        self.driver.get("https://ocw.mit.edu/search/")
        time.sleep(2)  # Allow page to load
        
        topic_data = []
        try:
            # Get all department elements
            departments = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.CLASS_NAME, "facet-label-div"))
            )
            
            # Extract department names and URLs
            for dept in departments:
                try:
                    name = dept.find_element(By.CSS_SELECTOR, "label.facet-key div").text
                    # Get the URL from the label's for attribute
                    label = dept.find_element(By.CSS_SELECTOR, "label.facet-key")
                    dept_id = label.get_attribute("for")
                    url = f"https://ocw.mit.edu/search/?d={dept_id}"
                    
                    self.cur.execute("""
                        INSERT INTO departments (name, url)
                        VALUES (%s, %s)
                        ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url
                        RETURNING id
                    """, (name, url))
                    
                    topic_data.append([name, url])
                    print(f"Found department: {name}")
                    
                except Exception as e:
                    print(f"Error processing department: {e}")
                    continue
            
            self.conn.commit()
            return topic_data
            
        except Exception as e:
            print(f"Error getting departments: {e}")
            return []

    def obtain_courses_list(self, dept_name, num_courses=25):
        dept_url = get_departments_url(dept_name)
        return get_courses(dept_url, num_courses)
    
    def obtain_course_details(self, course_url):
        return get_course_details(course_url)

    def store_department(self, name, url):
        """Store department and return its ID"""
        self.cur.execute("""
            INSERT INTO departments (name, url)
            VALUES (%s, %s)
            ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url
            RETURNING id
        """, (name, url))
        self.conn.commit()
        return self.cur.fetchone()[0]

    def store_course(self, department_id, name, url):
        """Store course and return its ID"""
        self.cur.execute("""
            INSERT INTO courses (department_id, name, url)
            VALUES (%s, %s, %s)
            ON CONFLICT (department_id, url) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (department_id, name, url))
        self.conn.commit()
        return self.cur.fetchone()[0]

    def store_course_details(self, course_id, details):
        """Store course details"""
        if not details:  # If details is None or empty
            print(f"No details found for course {course_id}")
            return
            
        self.cur.execute("""
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
            details.get('name'),
            details.get('description'),
            details.get('prerequisites'),
            details.get('syllabus_url'),
            details.get('course_materials_url'),
            details.get('assignments_url')
        ))
        self.conn.commit()

    def run(self):
        try:
            # Get and store departments
            departments = self.obtain_departments()
            total_depts = len(departments)
            
            print(f"\nFound {total_depts} departments to process")
            for i, (dept_name, dept_url) in enumerate(departments, 1):
                print(f"\nProcessing department {i}/{total_depts}: {dept_name}")
                try:
                    dept_id = self.store_department(dept_name, dept_url)
                    
                    # Get and store courses for this department
                    courses = self.obtain_courses_list(dept_name)  # Pass dept_name instead of URL
                    print(f"Found {len(courses)} courses")
                    
                    for j, (course_name, course_url) in enumerate(courses, 1):
                        print(f"Processing course {j}/{len(courses)}: {course_name}")
                        try:
                            course_id = self.store_course(dept_id, course_name, course_url)
                            details = self.obtain_course_details(course_url)
                            self.store_course_details(course_id, details)
                        except Exception as e:
                            print(f"Error processing course {course_name}: {e}")
                            continue
                            
                except Exception as e:
                    print(f"Error processing department {dept_name}: {e}")
                    continue
                    
        finally:
            self.cleanup()

    def cleanup(self):
        self.driver.quit()
        self.cur.close()
        self.conn.close()

if __name__ == "__main__":
    scraper = MITCourseScraper()
    try:
        scraper.run()
    except Exception as e:
        print(f"Error: {e}")
        scraper.cleanup()