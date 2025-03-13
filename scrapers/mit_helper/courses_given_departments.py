from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os

# for a department: 
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

def get_departments_url(department_name):
    query = "%20".join(department_name.strip().split())
    url = "https://ocw.mit.edu/search/?d=" + query
    # print(f"Generated URL: {url}")
    return url

def get_courses(page_url, max_courses = 25):
    def scroll_to_bottom():
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    driver.get(url = page_url)
    scroll_to_bottom()
    time.sleep(2)

    courses = []
    wait_till_condition = EC.presence_of_all_elements_located((By.CLASS_NAME, "course-title"))
    course_elements = WebDriverWait(driver, 10).until(wait_till_condition)
    for course in course_elements:
        try:
            course_name = course.find_element(By.TAG_NAME, "span").text
            course_link = course.find_element(By.TAG_NAME, "a").get_attribute("href")
            courses.append([course_name, course_link])
        except Exception as e:
            print(f"Error processing course: {e}")
            continue

    # print(courses)
    return courses

def get_course_details(course_url = "https://ocw.mit.edu/courses/18-s191-introduction-to-computational-thinking-fall-2020/"):
    driver.get(url = course_url)

    course_info = {
        'name' : None,
        'description' : None,
        # 'instructors' : None,
        'prerequisites' : None,
        'syllabus_url' : course_url + "pages/syllabus",
        'course_materials_url': course_url + "pages/course-materials",
        'assignments_url' : course_url + "pages/assignments"
    }

    # get course name
    course_name = driver.find_element(By.TAG_NAME, "h1").text
    course_info['name'] = course_name

    # get course description
    show_more_button = driver.find_element(By.XPATH, "//button[@id='expand-description' and @type='button']")
    show_more_button.click()
    # print("clicked button!")
    time.sleep(1)
    course_description = driver.find_element(By.ID, "expanded-description").text
    course_description = course_description.replace("Show less", "").strip()
    # print(course_description)
    course_info['description'] = course_description

    driver.get(course_url + "pages/syllabus")
    time.sleep(2)
    # get prereqs
    prereqs = driver.find_element(By.XPATH, "//h3[@id='prerequisites']/following-sibling::p[1]").text
    # print(f"Prerequisites: {prereqs}")
    course_info['prerequisites'] = prereqs

    # # get instructors
    # toggle_instructors = driver.find_element(By.XPATH, "//a[@aria-controls='partial-collapse-container_instructors']" )
    # toggle_instructors.click()
    # time.sleep(1)
    # # Get all instructor links
    # instructor_elements = driver.find_elements(By.CSS_SELECTOR, "a.course-info-instructor")
    # instructors = []
    # for instructor in instructor_elements:
    #     name = instructor.text.strip()
    #     url = instructor.get_attribute("href")
    #     instructors.append({
    #         'name': name,
    #         'url': url
    #     })
    #     print(instructor)
    # course_info['instructors'] = instructors

    return course_info