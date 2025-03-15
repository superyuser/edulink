from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.llm_interface import CourseRecommender
from main import get_user, create_user
import json
import datetime
import psycopg2
from db_config import DB_PARAMS

app = Flask(__name__)
CORS(app)

# Initialize course recommender
recommender = CourseRecommender()

@app.route('/api/user', methods=['POST'])
def handle_user():
    data = request.json
    username = data.get('username')
    if request.args.get('action') == 'create':
        user = create_user(username)
    else:
        user = get_user(username)
    return jsonify(user)

@app.route('/api/user/interests', methods=['POST'])
def update_interests():
    data = request.json
    user_id = data.get('userId')
    interests = data.get('interests')
    try:
        with psycopg2.connect(**DB_PARAMS) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                UPDATE users 
                SET interests = %s::jsonb
                WHERE id = %s
                RETURNING *
                """, (json.dumps(interests), user_id))
                user = dict(cur.fetchone())
                conn.commit()
        return jsonify(user)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/courses/search', methods=['POST'])
def search_courses():
    data = request.json
    query = data.get('query')
    user_interests = data.get('interests', [])
    
    # Step 1: Department Identification
    departments = recommender.identify_departments(query)
    
    # Step 2: Initial Course Selection
    courses = recommender.search_courses(query, departments, {
        'title': 'A',
        'description': 'B',
        'department': 'C'
    })
    
    # Step 3: Final Course Ranking
    ranked_courses = recommender.rank_courses(courses, query, user_interests)
    
    return jsonify({
        "courses": ranked_courses[:8],
        "departments": departments
    })

@app.route('/api/courses/complete', methods=['POST'])
def complete_course():
    data = request.json
    user_id = data.get('userId')
    course_id = data.get('courseId')
    
    try:
        with psycopg2.connect(**DB_PARAMS) as conn:
            with conn.cursor() as cur:
                completion = {
                    'course_id': course_id,
                    'completed_at': datetime.datetime.now().isoformat()
                }
                cur.execute("""
                UPDATE users 
                SET completed_courses = completed_courses || %s::jsonb,
                    total_credits = total_credits + 3
                WHERE id = %s
                RETURNING *
                """, (json.dumps([completion]), user_id))
                user = dict(cur.fetchone())
                conn.commit()
        return jsonify(user)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)