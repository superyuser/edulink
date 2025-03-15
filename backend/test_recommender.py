import os
import asyncio
from typing import Optional, List, Dict
import psycopg2
from psycopg2.extras import DictCursor
from backend.llm_interface import CourseRecommender
from rich.console import Console
from rich.prompt import Prompt
from rich.panel import Panel
from rich.table import Table
from rich import print as rprint
import json
import datetime
import traceback

# Initialize Rich console for better UI
console = Console()

# Database configuration
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'edulink'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'rockfish0920'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

class EduLinkApp:
    def __init__(self):
        self.recommender = CourseRecommender()
        self.console = Console()
        self.current_user = None
    
    async def setup_database(self):
        """Create users table if it doesn't exist."""
        try:
            with psycopg2.connect(**DB_CONFIG) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(100) UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        total_credits INTEGER DEFAULT 0,
                        completed_courses JSONB DEFAULT '[]'::jsonb,
                        interests JSONB DEFAULT '[]'::jsonb
                    )
                    """)
                conn.commit()
        except Exception as e:
            console.print(f"[red]Database setup error: {e}[/red]")
            raise
    
    async def create_user(self, username: str) -> Optional[Dict]:
        """Create a new user."""
        try:
            with psycopg2.connect(**DB_CONFIG) as conn:
                with conn.cursor(cursor_factory=DictCursor) as cur:
                    cur.execute("""
                    INSERT INTO users (username)
                    VALUES (%s)
                    RETURNING id, username, total_credits, interests, completed_courses
                    """, (username,))
                    user = dict(cur.fetchone())
                    conn.commit()
            return user
        except Exception as e:
            console.print(f"[red]Error creating user: {e}[/red]")
            return None
    
    async def get_user(self, username: str) -> Optional[Dict]:
        """Get user by username."""
        try:
            with psycopg2.connect(**DB_CONFIG) as conn:
                with conn.cursor(cursor_factory=DictCursor) as cur:
                    cur.execute("""
                    SELECT id, username, total_credits, interests, completed_courses
                    FROM users
                    WHERE username = %s
                    """, (username,))
                    result = cur.fetchone()
                    return dict(result) if result else None
        except Exception as e:
            console.print(f"[red]Error fetching user: {e}[/red]")
            return None
    
    async def show_welcome(self):
        """Show welcome screen and get/create user."""
        console.clear()
        console.print(Panel.fit(
            "[bold blue]Welcome to EduLink![/bold blue]\n"
            "Your personalized learning platform",
            border_style="blue"
        ))
        
        username = Prompt.ask("\nEnter your name or nickname")
        
        # Check if user exists
        user = await self.get_user(username)
        if not user:
            console.print("\n[yellow]New user detected! Creating your profile...[/yellow]")
            user = await self.create_user(username)
            if not user:
                console.print("[red]Failed to create user profile. Please try again.[/red]")
                return False
        
        self.current_user = user
        console.print(f"\n[green]Welcome, {username}![/green]")
        return True

    async def get_course_recommendations(self, query: str) -> List[Dict]:
        """
        Retrieve course recommendations using the CourseRecommender.
        The query is passed directly as in the test script.
        """
        try:
            # Call the recommender's synchronous method in a thread.
            results = await asyncio.to_thread(self.recommender.get_recommendations, query)
            if "error" in results:
                console.print(f"[red]Error: {results['error']}[/red]")
                return []
            console.print(f"[dim]Found departments: {results.get('departments', [])}[/dim]")
            console.print(f"[dim]Total courses found: {results.get('total_results', 0)}[/dim]")
            return results.get("courses", [])
        except Exception as e:
            console.print(f"[red]Error getting recommendations: {e}[/red]")
            return []
    
    async def show_course_recommendations(self, courses: List[Dict]):
        """Display course recommendations in a nice table."""
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Course")
        table.add_column("Department")
        table.add_column("Description")
        
        for course in courses:
            instructors = course.get("instructors")
            instructors_str = ", ".join(instructors) if instructors else "None"
            table.add_row(
                f"{course['course_code']}: {course['title']}",
                f"{course['department_name']} ({course['department_code']})",
                (course['description'][:100] + "...") if course.get('description') else "No description"
            )
        
        console.print(table)
    
    async def main_loop(self):
        """Main application loop."""
        try:
            await self.setup_database()
            if not await self.show_welcome():
                return

            while True:
                # Get course query from the user.
                query = Prompt.ask("\nWhat would you like to learn about?")
                if query.lower() in ['exit', 'quit']:
                    break

                console.print("\n[bold]Finding the best courses for you...[/bold]")
                courses = await self.get_course_recommendations(query)
                
                if courses:
                    await self.show_course_recommendations(courses)
                else:
                    console.print("[yellow]No courses found. Try a different search.[/yellow]")
                
                action = Prompt.ask("\nPress Enter to search again or type 'exit' to quit", default="")
                if action.lower() == "exit":
                    break

        except Exception as e:
            console.print(f"[red]An error occurred: {e}[/red]")
            console.print(traceback.format_exc())

if __name__ == "__main__":
    app = EduLinkApp()
    asyncio.run(app.main_loop())
