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

def get_departments_url(courses):
    chained_query = ""
    while courses:
        course = courses.pop()
        print(course)
        words = course.strip().split()
        print(words)
        query = ""
        while words:
            word = words.pop(0)
            if words:
                query += word + "%20"
            else:
                query += word
        chained_query += query
        print(chained_query)
        if courses: 
            # add last "&d="
            chained_query += "&d="
    url = "https://ocw.mit.edu/search/?d=" + chained_query
    print(url);
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

    print(courses)
    return courses

def get_courses(courses_list, num_returns = 25):
    display_url = get_departments_url(courses_list)
    return get_courses(display_url, num_returns)