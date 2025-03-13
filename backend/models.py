from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

course_prerequisites = Table(
    'course_prerequisites',
    Base.metadata,
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True),
    Column('prerequisite_id', Integer, ForeignKey('courses.id'), primary_key=True)
)

class University(Base):
    __tablename__ = 'universities'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    website = Column(String)
    courses = relationship("Course", back_populates="university")

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(Integer, primary_key=True)
    course_code = Column(String)
    name = Column(String)
    description = Column(String)
    credits = Column(Integer)
    university_id = Column(Integer, ForeignKey('universities.id'))
    department = Column(String)
    level = Column(String)  # undergraduate, graduate, etc.
    
    # Vector embedding for semantic search
    embedding = Column(String)
    
    university = relationship("University", back_populates="courses")
    prerequisites = relationship(
        "Course",
        secondary=course_prerequisites,
        primaryjoin=id==course_prerequisites.c.course_id,
        secondaryjoin=id==course_prerequisites.c.prerequisite_id,
    )