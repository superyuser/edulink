document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const nameForm = document.getElementById('name-form');
    const courseForm = document.getElementById('course-form');
    const resultsSection = document.getElementById('results-section');
    const nameInput = document.getElementById('name-input');
    const nameSubmit = document.getElementById('name-submit');
    const userNameSpan = document.getElementById('user-name');
    const courseInput = document.getElementById('course-input');
    const courseSubmit = document.getElementById('course-submit');
    const coursesContainer = document.getElementById('courses-container');
    const loading = document.getElementById('loading');
    
    let userId = null;
    
    // Handle name submission
    nameSubmit.addEventListener('click', function() {
        const username = nameInput.value.trim();
        if (username) {
            loading.style.display = 'block';
            
            // Call the API to get or create user
            fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username })
            })
            .then(response => response.json())
            .then(user => {
                loading.style.display = 'none';
                
                if (user && user.id) {
                    userId = user.id;
                    userNameSpan.textContent = username;
                    
                    // Hide name form and show course form
                    nameForm.style.display = 'none';
                    courseForm.style.display = 'block';
                } else {
                    alert('Error: Could not create or retrieve user.');
                }
            })
            .catch(error => {
                loading.style.display = 'none';
                alert('Error: ' + error.message);
            });
        } else {
            alert('Please enter your name.');
        }
    });
    
    // Handle course search
    courseSubmit.addEventListener('click', function() {
        const query = courseInput.value.trim();
        if (query) {
            // Clear previous results
            coursesContainer.innerHTML = '';
            
            // Show loading indicator
            loading.style.display = 'block';
            resultsSection.style.display = 'none';
            
            // Call the API to search for courses
            fetch('/api/courses/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    query: query,
                    interests: [] // Could be populated from user profile if needed
                })
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading indicator
                loading.style.display = 'none';
                
                // Show results section
                resultsSection.style.display = 'block';
                
                if (data && data.courses && data.courses.length > 0) {
                    // Create course cards
                    data.courses.forEach(course => {
                        const courseCard = document.createElement('div');
                        courseCard.className = 'course-card';
                        
                        courseCard.innerHTML = `
                            <h3 class="course-title">${course.title}</h3>
                            <p class="course-code">${course.course_code}</p>
                            <p class="course-department">${course.department_name} (${course.department_code})</p>
                            <p class="course-description">${course.description}</p>
                            <a href="https://cs103.stanford.edu" class="redirect-btn" target="_blank">View Course</a>
                        `;
                        
                        coursesContainer.appendChild(courseCard);
                    });
                } else {
                    coursesContainer.innerHTML = '<p>No courses found. Try a different search term.</p>';
                }
            })
            .catch(error => {
                loading.style.display = 'none';
                alert('Error: ' + error.message);
            });
        } else {
            alert('Please enter a course topic to search for.');
        }
    });
    
    // Handle enter key presses
    nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            nameSubmit.click();
        }
    });
    
    courseInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            courseSubmit.click();
        }
    });
});