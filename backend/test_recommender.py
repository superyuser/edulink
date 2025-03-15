import asyncio
from llm_interface import CourseRecommender

async def test_recommendations():
    recommender = CourseRecommender()
    
    # Test query
    query = "I want to learn about computer science"
    
    try:
        print("Getting recommendations for query:", query)
        results = await recommender.get_recommendations(query)
        
        if "error" in results:
            print("Error:", results["error"])
        else:
            print("\nFound departments:", results["departments"])
            print("\nTotal courses found:", results["total_results"])
            print("\nRecommended Courses:")
            for course in results["courses"]:
                print(f"\nTitle: {course['title']}")
                print(f"Code: {course['course_code']}")
                print(f"Department: {course['department_name']} ({course['department_code']})")
                print(f"Instructors: {', '.join(course['instructors'])}")
                print(f"Description: {course['description']}")
    
    except Exception as e:
        print("Error during recommendation:", str(e))

if __name__ == "__main__":
    asyncio.run(test_recommendations())