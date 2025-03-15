import json
import os
import traceback
from typing import List, Dict
import psycopg2
from psycopg2.extras import DictCursor
import torch
import numpy as np
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel

# Database connection parameters (same as in your schema script)
DB_PARAMS = {
    'dbname': 'edulink',
    'user': 'postgres',
    'password': 'rockfish0920',
    'host': 'localhost',
    'port': '5432'
}

# Use the same embedding model as used in storeCourses
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
embedding_tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
embedding_model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)

def compute_embedding(text: str) -> list:
    """Compute vector embedding for the given text using mean pooling."""
    if not text:
        text = ""
    inputs = embedding_tokenizer.encode_plus(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = embedding_model(**inputs)
    # Mean pooling over token embeddings
    embedding = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
    return embedding

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

class CourseRecommender:
    """Course recommendation system using vector similarity search and PostgreSQL."""
    
    def __init__(self):
        # (No LLM chain is used here; we use semantic similarity via our embedding model.)
        print("CourseRecommender initialized.")
    
    def get_all_departments(self) -> List[Dict]:
        """Fetch all departments from the database."""
        try:
            with psycopg2.connect(**DB_PARAMS) as conn:
                with conn.cursor(cursor_factory=DictCursor) as cur:
                    cur.execute("SELECT code, name FROM departments")
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error fetching departments: {e}")
            return []
    
    def identify_departments(self, query: str) -> List[str]:
        """
        Identify relevant departments by comparing the query embedding to each department's text.
        Returns a list of department codes for the top 3 matches.
        """
        try:
            # Embed the user query
            query_embedding = compute_embedding(query)
            
            departments = self.get_all_departments()
            dept_scores = []
            for dept in departments:
                # Construct a string combining the department name and code
                dept_text = f"{dept['name']} ({dept['code']})"
                dept_embedding = compute_embedding(dept_text)
                score = cosine_similarity(query_embedding, dept_embedding)
                dept_scores.append((dept['code'], score))
            
            # Sort departments by score (highest first) and take top 3
            dept_scores.sort(key=lambda x: x[1], reverse=True)
            top_depts = [code for code, _ in dept_scores[:3]]
            return top_depts
        except Exception as e:
            print(f"Department identification error: {e}")
            return []
    
    def get_courses_by_departments(self, dept_codes: List[str]) -> List[Dict]:
        """
        Retrieve courses from the database that belong to the specified department codes.
        This query joins the courses table with departments to return department info.
        """
        try:
            with psycopg2.connect(**DB_PARAMS) as conn:
                with conn.cursor(cursor_factory=DictCursor) as cur:
                    query_sql = """
                    SELECT 
                        c.id,
                        c.course_code,
                        c.title,
                        c.description,
                        c.instructors,
                        c.credits,
                        c.ipfs_materials_hash,
                        c.blockchain_certificate_id,
                        c.embedding,
                        d.code as department_code,
                        d.name as department_name
                    FROM courses c
                    JOIN departments d ON c.department_id = d.id
                    WHERE d.code = ANY(%s)
                    """
                    cur.execute(query_sql, (dept_codes,))
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error fetching courses: {e}")
            return []
    
    def get_recommendations(self, query: str) -> Dict:
        """
        Generate course recommendations by:
         1. Identifying the top 3 matching departments.
         2. Fetching all courses from those departments.
         3. Embedding the user query.
         4. Computing cosine similarity between the query embedding and each course's stored embedding.
         5. Returning the top 5 courses (sorted by similarity score).
        """
        try:
            # Step 1: Identify departments.
            top_depts = self.identify_departments(query)
            if not top_depts:
                return {"error": "No matching departments found"}
            print(f"Selected departments: {top_depts}")
            
            # Step 2: Retrieve courses in these departments.
            courses = self.get_courses_by_departments(top_depts)
            if not courses:
                return {"error": "No courses found in selected departments"}
            print(f"Total courses found: {len(courses)}")
            
            # Step 3: Embed the user query.
            query_embedding = compute_embedding(query)
            
            # Step 4: For each course, compute similarity between query and stored embedding.
            for course in courses:
                stored_emb = course.get("embedding")
                course_embedding = None
                # The stored embedding might be a list or a JSON string.
                if stored_emb:
                    if isinstance(stored_emb, str):
                        try:
                            course_embedding = json.loads(stored_emb)
                        except Exception as e:
                            print(f"Error parsing embedding for course {course.get('course_code')}: {e}")
                    elif isinstance(stored_emb, list):
                        course_embedding = stored_emb
                # Compute cosine similarity (or 0 if embedding missing)
                if course_embedding:
                    course["similarity"] = cosine_similarity(query_embedding, course_embedding)
                else:
                    course["similarity"] = 0.0
            
            # Step 5: Sort courses by similarity and take the top 5.
            courses_sorted = sorted(courses, key=lambda x: x["similarity"], reverse=True)
            top_courses = courses_sorted[:8]
            
            response = {
                "query": query,
                "departments": top_depts,
                "total_results": len(courses),
                "courses": top_courses
            }
            return response
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            traceback.print_exc()
            return {"error": str(e)}

# Example usage (if running this file directly):
if __name__ == "__main__":
    recommender = CourseRecommender()
    test_query = "I want to learn about computer science"
    recommendations = recommender.get_recommendations(test_query)
    print("Recommendations:")
    print(json.dumps(recommendations, indent=2))
