from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
import os
import sys

# Add the project root to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import your application components
from backend.llm_interface import CourseRecommender
import json
import uuid

app = Flask(__name__, 
           template_folder='../templates',  # Point to templates in project root
           static_folder='../static')        # Point to static files in project root
CORS(app)

# Copy the rest of your flask_api.py code here
# ...

# For Vercel deployment
app.config['JSON_SORT_KEYS'] = False

# This is important for Vercel
application = app