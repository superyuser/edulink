from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

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
    eth_address = Column(String)  # University's ETH address for minting certificates
    is_verified = Column(Boolean, default=False)
    courses = relationship("Course", back_populates="university")

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(Integer, primary_key=True)
    course_code = Column(String)
    name = Column(String)
    description = Column(String)
    credits = Column(Integer)
    eth_value = Column(Float)  # ETH credits earned upon completion
    university_id = Column(Integer, ForeignKey('universities.id'))
    department = Column(String)
    level = Column(String)  # undergraduate, graduate, etc.
    materials_ipfs_hash = Column(String)  # IPFS hash for course materials
    nft_template_uri = Column(String)  # URI template for course completion NFT
    
    # Vector embedding for semantic search
    embedding = Column(String)
    
    university = relationship("University", back_populates="courses")
    prerequisites = relationship(
        "Course",
        secondary=course_prerequisites,
        primaryjoin=id==course_prerequisites.c.course_id,
        secondaryjoin=id==course_prerequisites.c.prerequisite_id,
    )

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    eth_address = Column(String, unique=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    total_credits = Column(Float, default=0)  # Total ETH credits earned
    is_instructor = Column(Boolean, default=False)
    avatar_nft_id = Column(String, nullable=True)  # User's avatar NFT token ID
    created_at = Column(DateTime, default=datetime.utcnow)

class CourseProgress(Base):
    __tablename__ = 'course_progress'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    course_id = Column(Integer, ForeignKey('courses.id'))
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    nft_token_id = Column(String, nullable=True)  # NFT token ID after completion
    certificate_tx_hash = Column(String, nullable=True)  # Transaction hash of certificate minting
    
    user = relationship("User")
    course = relationship("Course")