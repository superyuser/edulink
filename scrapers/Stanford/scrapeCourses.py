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
from tqdm import tqdm
import datetime
import re

# user enters DEPARTMENT THEY WANT TO SCRAPE, NUM COURSES (default = 10) -> returns JSON of scraped data

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
OUTPUT_DIR = "./data/scraped"
DEPARTMENT_FILEPATH = "./data/departments.json"

def get_url(code):
    # this is just for spring 24-25, but can be tweaked for other quarters later if necessary
    return "https://explorecourses.stanford.edu/print?q={}&descriptions=on&academicYear=&filter-departmentcode-{}=on&filter-term-Spring=on&page=0&filter-coursestatus-Active=on&catalog=".format(code, code)

def scrapekCourses(code, k=10):
    results = []
    allClassContainers = driver.find_elements(By.CLASS_NAME, "searchResult")
    addedCount = 0
    if k == "all":
        k = len(allClassContainers)
    for container in allClassContainers[:k]:
        courseNumber = container.find_element(By.CLASS_NAME, "courseNumber").text[:-1]
        courseName = container.find_element(By.CLASS_NAME, "courseTitle").text
        courseDescription = container.find_element(By.CLASS_NAME, "courseDescription").text
        instructors = container.find_elements(By.TAG_NAME, "a")
        instructorsList = []
        for instructor in instructors:
            instructorsList.append(instructor.text)
        results.append({
            "courseNumber": courseNumber,
            "courseName": courseName,
            "courseDescription": courseDescription,
            "instructors": instructorsList
        })
        addedCount += 1
        # print(f"{courseName} ({courseNumber})")
    return results

def writeToJSON(data, filename):
    if not os.path.exists(OUTPUT_DIR):
        os.mkdir(OUTPUT_DIR)
    with open(f'{OUTPUT_DIR}/{filename}.json', 'a') as f:
        json.dump(data, f, indent=4)
    # print(f"Wrote {len(data)} courses to {filename}!")

def getAllCoursesFor(code, k=10):
    driver.get(url=get_url(code))
    data = scrapekCourses(code, k)
    return data

def retrieveDepartmentCode():
    with open(DEPARTMENT_FILEPATH, "r") as f:
        return [line["code"] for line in json.load(f)]

def getAllCoursesForAllDeps(k=10):
    filename = f"AllDepts_Got{k}"
    departments = retrieveDepartmentCode()
    allCourses = []
    for department in tqdm(departments, desc="Scraping departments", unit="department"):
        print(f"[STARTING]: {department}")
        allCourses.extend(getAllCoursesFor(department, k=k))
    print("[COMPLETED]: All departments scraped!")
    writeToJSON(allCourses, filename)

if __name__ == "__main__":
    k = int(input("Enter number of courses to scrape (default = 10): "))
    getAllCoursesForAllDeps(k)
    driver.close()

