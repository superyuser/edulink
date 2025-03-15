-- Schools table to track academic schools/colleges
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Departments table with school association
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    school_id INTEGER REFERENCES schools(id),
    search_url VARCHAR(200)
);

-- Course subjects for better categorization
CREATE TABLE IF NOT EXISTS course_subjects (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(100) UNIQUE NOT NULL
);

-- Main courses table with full-text search capabilities
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    department_id INTEGER REFERENCES departments(id),
    credits INTEGER DEFAULT 3,
    level VARCHAR(20) CHECK (level IN ('introductory', 'intermediate', 'advanced')),
    instructors JSONB DEFAULT '[]'::jsonb,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    materials_available BOOLEAN DEFAULT false,
    certificate_available BOOLEAN DEFAULT false,
    content_types JSONB DEFAULT '[]'::jsonb,
    ipfs_materials_hash TEXT,
    blockchain_certificate_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', title), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(department_id::text, '')), 'C')
    ) STORED
);

-- Course-subject mapping
CREATE TABLE IF NOT EXISTS course_subject_mapping (
    course_id INTEGER REFERENCES courses(id),
    subject_id INTEGER REFERENCES course_subjects(id),
    PRIMARY KEY (course_id, subject_id)
);

-- Users table for tracking learners
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_credits INTEGER DEFAULT 0,
    completed_courses JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS courses_search_idx ON courses USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS courses_department_idx ON courses (department_id);
CREATE INDEX IF NOT EXISTS departments_school_idx ON departments (school_id);

-- Insert default schools in priority order
INSERT INTO schools (code, name) VALUES
    ('ATH', 'School of Athletics'),
    ('SUS', 'School of Sustainability'),
    ('GSB', 'Graduate School of Business'),
    ('EDU', 'School of Education'),
    ('ENG', 'School of Engineering'),
    ('H&S', 'School of Humanities & Sciences')
ON CONFLICT (code) DO NOTHING;