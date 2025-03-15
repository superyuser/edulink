from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
from backend.llm_interface import CourseRecommender
import json
import os

app = Flask(__name__)
CORS(app)

# Initialize course recommender
recommender = CourseRecommender()

# Create templates directory if it doesn't exist
os.makedirs('templates', exist_ok=True)

# Create index.html template
if not os.path.exists('templates/index.html'):
    with open('templates/index.html', 'w') as f:
        f.write('''<!DOCTYPE html>
<html>
<head>
    <title>EduLink Course Recommender</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .search-form {
            margin: 20px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        input[type="text"] {
            width: 70%;
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            padding: 10px 15px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #2980b9;
        }
        .course-card {
            margin: 15px 0;
            padding: 15px;
            background-color: #fff;
            border-left: 5px solid #3498db;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .similarity-score {
            color: #7f8c8d;
            font-size: 14px;
        }
        .dept-info {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .description {
            margin-top: 10px;
        }
        .resource-info {
            margin-top: 10px;
            font-size: 14px;
            color: #27ae60;
        }
        .error-message {
            color: #e74c3c;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>EduLink Course Recommender</h1>
    
    <div class="search-form">
        <h2>What would you like to learn?</h2>
        <form action="/" method="post">
            <input type="text" name="query" placeholder="e.g., Computer Science, Machine Learning, Philosophy" required>
            <button type="submit">Search</button>
        </form>
    </div>
    
    {% if error %}
    <div class="error-message">
        <p>{{ error }}</p>
    </div>
    {% endif %}
</body>
</html>''')

# Create results.html template
if not os.path.exists('templates/results.html'):
    with open('templates/results.html', 'w') as f:
        f.write('''<!DOCTYPE html>
<html>
<head>
    <title>EduLink Course Recommender - Results</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .search-form {
            margin: 20px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        input[type="text"] {
            width: 70%;
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            padding: 10px 15px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #2980b9;
        }
        .course-card {
            margin: 15px 0;
            padding: 15px;
            background-color: #fff;
            border-left: 5px solid #3498db;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .similarity-score {
            color: #7f8c8d;
            font-size: 14px;
        }
        .dept-info {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .description {
            margin-top: 10px;
        }
        .resource-info {
            margin-top: 10px;
            font-size: 14px;
            color: #27ae60;
        }
        .error-message {
            color: #e74c3c;
            font-weight: bold;
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #3498db;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h1>EduLink Course Recommender</h1>
    
    <div class="results">
        <h2>Results for: "{{ query }}"</h2>
        
        <p>Departments: {{ ', '.join(departments) }}</p>
        <p>Total results: {{ total_results }}</p>
        
        <h3>Top Recommendations</h3>
        
        {% for course in courses %}
        <div class="course-card">
            <h3>{{ course.title or 'Untitled Course' }} ({{ course.course_code or 'No Code' }})</h3>
            <p class="dept-info">Department: {{ course.department_name or 'Unknown' }} ({{ course.department_code or 'Unknown' }})</p>
            <p class="similarity-score">Relevance Score: {{ "%.4f"|format(course.similarity) }}</p>
            
            {% if course.credits %}
            <p>Credits: {{ course.credits }}</p>
            {% endif %}
            
            {% if course.description %}
            <p class="description">{{ course.description }}</p>
            {% endif %}
            
            <div class="resource-info">
                {% if course.ipfs_materials_hash %}
                <p>✓ Course materials available</p>
                {% endif %}
                
                {% if course.blockchain_certificate_id %}
                <p>✓ Blockchain certificate available</p>
                {% endif %}
            </div>
        </div>
        {% endfor %}
    </div>
    
    <a href="/" class="back-link">← New Search</a>
</body>
</html>''')

@app.route('/', methods=['GET', 'POST'])
def index():
    """Handle the home page with course search form"""
    if request.method == 'POST':
        query = request.form.get('query', '').strip()
        if query:
            return redirect(url_for('results', query=query))
        else:
            return render_template('index.html', error="Please enter a search query")
    
    return render_template('index.html')

@app.route('/results')
def results():
    """Show course recommendation results"""
    query = request.args.get('query', '')
    if not query:
        return redirect(url_for('index'))
    
    # Use the recommender to get course recommendations
    result = recommender.get_recommendations(query)
    
    if "error" in result:
        return render_template('index.html', error=result["error"])
    
    # Pass the data to the template
    return render_template(
        'results.html',
        query=query,
        departments=result.get('departments', []),
        total_results=result.get('total_results', 0),
        courses=result.get('courses', [])
    )

# Keep API endpoint for programmatic access
@app.route('/api/courses/recommendations', methods=['POST'])
def get_recommendations():
    data = request.json
    query = data.get('query')
    
    recommendations = recommender.get_recommendations(query)
    return jsonify(recommendations)

if __name__ == '__main__':
    print("Starting Flask web server on http://localhost:5000")
    app.run(debug=True, port=5000)