from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, database
from .llm_interface import CourseDiscovery
from pydantic import BaseModel

app = FastAPI()

class Query(BaseModel):
    text: str

@app.post("/search_courses")
async def search_courses(
    query: Query,
    db: Session = Depends(database.get_db)
):
    discovery = CourseDiscovery(db)
    results = await discovery.process_query(query.text)
    return results

@app.get("/courses/{course_id}")
def get_course(course_id: int, db: Session = Depends(database.get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course