from langchain import PromptTemplate, LLMChain
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import PostgresVector
from sqlalchemy.orm import Session
from typing import List
import os

class CourseDiscovery:
    def __init__(self, db: Session):
        self.db = db
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-mpnet-base-v2"
        )
        
        self.prompt_template = PromptTemplate(
            input_variables=["query"],
            template="""
            Analyze the following query about educational interests and extract key information:
            Query: {query}
            
            Please identify:
            1. Subject areas
            2. Academic level
            3. Specific topics of interest
            4. Any constraints or preferences
            """
        )
    
    async def process_query(self, user_query: str) -> List[dict]:
        # Generate embeddings for the query
        query_embedding = self.embeddings.embed_query(user_query)
        
        # Search for similar courses using vector similarity
        similar_courses = await self.search_courses(query_embedding)
        
        # Process and rank results
        return self.rank_results(similar_courses, user_query)