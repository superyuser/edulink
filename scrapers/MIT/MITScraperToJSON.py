import json
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from mit_helper.courses_given_departments import get_courses, get_course_details, get_departments_url
from tqdm import tqdm
import datetime


class MITScraper:
    def __init__(self, output_dir="test_outputs", max_departments=5, max_courses=5):
        # Add these parameters
        self.max_departments = max_departments
        self.max_courses = max_courses

        # Setup Chrome options
        self.chrome_options = Options()
        # self.chrome_options.add_argument('--headless')  # Uncomment to run headless
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')
        
        # Setup WebDriver
        self.service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=self.service, options=self.chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        
        # Setup output directory and files
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.output_file = os.path.join(output_dir, "output.json")
        self.log_file = os.path.join(output_dir, "scraping.log")
        
        # Initialize data structure
        self.data = {}
        
        # Load existing data if any
        if os.path.exists(self.output_file):
            with open(self.output_file, 'r') as f:
                self.data = json.load(f)

    def log(self, message):
        """Log message to both console and file"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        with open(self.log_file, 'a') as f:
            f.write(log_message + '\n')

    def save_data(self):
        """Save current data to JSON file"""
        with open(self.output_file, 'w') as f:
            json.dump(self.data, f, indent=2)
        self.log(f"Data saved to {self.output_file}")

    def obtain_departments(self):
        """Get list of departments from MIT OCW"""
        self.log("Getting departments from MIT OCW...")
        self.driver.get("https://ocw.mit.edu/search/")
        time.sleep(2)  # Allow page to load
        
        departments = []
        try:
            # Get all department elements
            dept_elements = self.wait.until(
                EC.presence_of_all_elements_located((By.CLASS_NAME, "facet-label-div"))
            )
            
            # Extract department names and URLs
            for dept in dept_elements:
                try:
                    name = dept.find_element(By.CSS_SELECTOR, "label.facet-key div").text
                    label = dept.find_element(By.CSS_SELECTOR, "label.facet-key")
                    dept_id = label.get_attribute("for")
                    url = f"https://ocw.mit.edu/search/?d={dept_id}"
                    departments.append([name, url])
                    self.log(f"Found department: {name}")
                except Exception as e:
                    self.log(f"Error processing department element: {e}")
                    continue
            
            return departments
            
        except Exception as e:
            self.log(f"Error getting departments: {e}")
            return []

    def obtain_courses_list(self, dept_name, dept_url):
        """Get list of courses for a department"""
        try:
            self.log(f"Navigating to department URL: {dept_url}")
            self.driver.get(dept_url)
            time.sleep(3)  # Give more time for page load
            
            # Wait for course elements to be present
            self.wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "course-title"))
            )
            
            courses = []
            course_elements = self.driver.find_elements(By.CLASS_NAME, "course-title")
            
            for i, element in enumerate(course_elements[:self.max_courses]):
                try:
                    course_name = element.text.strip()
                    course_url = element.find_element(By.TAG_NAME, "a").get_attribute("href")
                    courses.append((course_name, course_url))
                    self.log(f"Found course {i+1}: {course_name}")
                except Exception as e:
                    self.log(f"Error extracting course info: {e}")
                    continue
                    
            return courses
        except Exception as e:
            self.log(f"Error getting courses for {dept_name}: {e}")
            return []

    def obtain_course_details(self, course_url):
        """Get detailed information for a course"""
        return get_course_details(course_url)

    def process_course(self, dept_name, course_name, course_url):
        """Process a single course"""
        try:
            time.sleep(2)  # Rate limiting
            details = self.obtain_course_details(course_url)
            
            # Store course details
            if dept_name not in self.data:
                self.data[dept_name] = {"courses": {}}
                
            self.data[dept_name]["courses"][course_name] = {
                "url": course_url,
                "details": details
            }
            return True
        except Exception as e:
            self.log(f"Error processing course {course_name}: {e}")
            return False

    def process_department(self, dept_name, dept_url):
        """Process a single department"""
        try:
            self.log(f"\nProcessing department: {dept_name}")
            
            # Initialize department in data structure
            if dept_name not in self.data:
                self.data[dept_name] = {
                    "url": dept_url,
                    "courses": {}
                }
            
            # Get courses for this department
            courses = self.obtain_courses_list(dept_name, dept_url)
            self.log(f"Found {len(courses)} courses in {dept_name}")
            return courses
        except Exception as e:
            self.log(f"Error processing department {dept_name}: {e}")
            return []

    def run(self):
        """Main scraper function with progress bars"""
        try:
            # Get all departments
            self.log("Starting MIT OCW scraper...")
            all_departments = self.obtain_departments()
            
            # Limit departments to max_departments
            departments = all_departments[:self.max_departments]
            
            # Process departments with progress bar
            self.log(f"Processing {len(departments)} departments (limited from {len(all_departments)})")
            total_courses = 0
            
            # First pass: Get all courses
            for dept_name, dept_url in tqdm(departments, desc="Getting course lists", unit="dept"):
                courses = self.process_department(dept_name, dept_url)
                total_courses += min(len(courses), self.max_courses)  # Adjust total for progress bar
                time.sleep(1)  # Rate limiting
            
            self.log(f"Found total of {total_courses} courses to process")
            
            # Second pass: Process all courses with overall progress bar
            processed_courses = 0
            failed_courses = []
            
            with tqdm(total=total_courses, desc="Processing courses", unit="course") as pbar:
                for dept_name, dept_url in departments:
                    courses = self.obtain_courses_list(dept_name)
                    # Limit courses per department
                    courses = courses[:self.max_courses]
                    
                    for course_name, course_url in courses:
                        success = self.process_course(dept_name, course_name, course_url)
                        if not success:
                            failed_courses.append((dept_name, course_name))
                        processed_courses += 1
                        pbar.update(1)
                        
                        # Save periodically (every 5 courses since we have fewer now)
                        if processed_courses % 5 == 0:
                            self.save_data()
            
            # Final save
            self.save_data()
            
            # Report results
            self.log("\nScraping completed!")
            self.log(f"Processed {processed_courses} courses from {len(departments)} departments")
            if failed_courses:
                self.log(f"Failed to process {len(failed_courses)} courses:")
                for dept, course in failed_courses:
                    self.log(f"- {dept}: {course}")
            
        except Exception as e:
            self.log(f"Fatal error: {e}")
        finally:
            self.cleanup()

    def cleanup(self):
        """Clean up resources"""
        self.driver.quit()


if __name__ == "__main__":
    scraper = MITScraper(
        max_departments=5,  # Limit to 5 departments
        max_courses=5      # Limit to 5 courses per department
    )
    try:
        scraper.run()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        scraper.cleanup()