# webapp/app.py

from flask import Flask, render_template

# Initialize the Flask application
app = Flask(__name__)

# Define the main route for your web app
@app.route('/')
def index():
    """
    This function handles requests to the root URL ('/') and
    renders the main HTML page for the user.
    """
    # Flask will automatically look for 'index.html' in the 'templates' folder.
    return render_template('index.html')

# This allows you to run the app directly using "python app.py"
if __name__ == '__main__':
    # debug=True allows the server to auto-reload when you save changes.
    # Remove debug=True when you deploy to production.
    app.run(debug=True, port=5000)
