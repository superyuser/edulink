import json
import os
import traceback
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel
from typing import List, Dict, Any
from psycopg2.errors import DatabaseError
from db_config import get_db_cursor
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_community.llms import HuggingFacePipeline

# Initialize the embedding model for user query embeddings
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

class CourseRecommender:
    """Course recommendation system using vector similarity search and PostgreSQL."""
    
    def __init__(self):
        # Initialize the department identification chain.
        # (For simplicity, we use a heuristic in identify_departments below.)
        self.dept_chain = LLMChain(
            llm=HuggingFacePipeline(pipeline=None),  # Not used in our simple heuristic below.
            prompt=PromptTemplate(
                template="""You are a Stanford course catalog expert. Given a query about courses,
identify the most relevant Stanford departments from the list below. Return ONLY the department codes
as a JSON array, sorted by relevance.

Available Departments:
{departments}

Query: {query}

Return format example: ["MATH", "CS", "STATS"]
Response:""",
                input_variables=["query", "departments"]
            )
        )
        print("CourseRecommender initialized.")
    
    async def get_all_departments(self) -> List[Dict[str, Any]]:
        """Fetch all departments from the database."""
        try:
            with get_db_cursor() as cur:
                query = """
                SELECT 
                    code,
                    name
                FROM departments
                ORDER BY code
                """
                cur.execute(query)
                departments = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in departments]
        except DatabaseError as e:
            print(f"Database error fetching departments: {e}")
            return []
    
    async def identify_departments(self, query: str) -> List[str]:
        """
        Identify relevant departments based on the user query.
        
        For demonstration purposes, we use a simple heuristic:
          - If the query mentions 'computer science' or 'programming', return a preset list.
          - Otherwise, attempt to use the LLM chain.
        """
        query_lower = query.lower()
        if "computer science" in query_lower or "programming" in query_lower:
            # Return a preset list for computer science and related areas.
            return ["CS", "DATASCI", "CME"]
        else:
            # Fallback: use the LLM chain (if properly configured)
            departments = await self.get_all_departments()
            dept_info = "\n".join([f"- {d['code']}: {d['name']}" for d in departments])
            try:
                result = await self.dept_chain.arun(query=query, departments=dept_info)
                matched_codes = json.loads(result)
                return matched_codes
            except Exception as e:
                print(f"Error in LLM department identification: {e}")
                return []
    
    async def get_courses_by_departments(self, dept_codes: List[str]) -> List[Dict[str, Any]]:
        """
        Retrieve courses from the database that belong to the specified department codes.
        Each returned course includes its stored JSON embedding.
        """
        try:
            with get_db_cursor() as cur:
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
                    d.name as department_name,
                    d.code as department_code
                FROM courses c
                JOIN departments d ON c.department_id = d.id
                WHERE d.code = ANY(%s)
                """
                cur.execute(query_sql, (dept_codes,))
                courses = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in courses]
        except DatabaseError as e:
            print(f"Database error fetching courses: {e}")
            return []
    
    async def get_recommendations(self, query: str) -> Dict[str, Any]:
        """
        Get course recommendations by:
          1. Identifying relevant departments,
          2. Fetching all courses in the top 3 departments,
          3. Embedding the user query,
          4. Computing cosine similarity between the query embedding and each course's embedding,
          5. Returning the top 5 courses by similarity score.
        """
        try:
            # Step 1: Identify relevant departments.
            departments = await self.identify_departments(query)
            if not departments:
                return {"error": "No relevant departments found"}
            
            # Only consider the top 3 matching departments.
            selected_depts = departments[:3]
            print(f"Selected departments: {selected_depts}")
            
            # Step 2: Retrieve courses from the selected departments.
            courses = await self.get_courses_by_departments(selected_depts)
            if not courses:
                return {"error": "No courses found in selected departments"}
            
            # Step 3: Embed the user query.
            query_embedding = compute_embedding(query)
            
            # Step 4: Compute cosine similarity between query embedding and each course's embedding.
            def cosine_similarity(vec1, vec2):
                vec1 = np.array(vec1)
                vec2 = np.array(vec2)
                norm1 = np.linalg.norm(vec1)
                norm2 = np.linalg.norm(vec2)
                if norm1 == 0 or norm2 == 0:
                    return 0.0
                return float(np.dot(vec1, vec2) / (norm1 * norm2))
            
            for course in courses:
                course_embedding = None
                if course.get('embedding'):
                    try:
                        # If embedding is a string, parse it; otherwise, assume it's already a list.
                        if isinstance(course['embedding'], str):
                            course_embedding = json.loads(course['embedding'])
                        else:
                            course_embedding = course['embedding']
                    except Exception as e:
                        print(f"Error parsing embedding for course {course.get('course_code')}: {e}")
                        course_embedding = None
                if course_embedding:
                    course['similarity'] = cosine_similarity(query_embedding, course_embedding)
                else:
                    course['similarity'] = 0.0
            
            # Step 5: Sort courses by similarity (descending) and take the top 5.
            courses_sorted = sorted(courses, key=lambda x: x['similarity'], reverse=True)
            top_courses = courses_sorted[:5]
            
            response = {
                "query": query,
                "departments": selected_depts,
                "total_results": len(courses),
                "courses": top_courses
            }
            
            return response
        except Exception as e:
            print(f"Error in get_recommendations: {e}")
            traceback.print_exc()
            return {"error": str(e)}
