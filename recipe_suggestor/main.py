# main.py
import os
import requests
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This allows the frontend to make requests to this backend

# IMPORTANT: In a real production environment, you would use a more secure
# way to handle your API key, like environment variables or a secret manager.
# For this example, we assume the key is available as an environment variable.
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAIGxggJJKfJKi3EOPEcUhFATkxGsKmUdU") 

@app.route('/generate-recipe', methods=['POST'])
def generate_recipe():
    """
    This endpoint receives a prompt from the frontend, gets a recipe from 
    the Gemini API, and returns it as JSON.
    """
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({"error": "Prompt is missing"}), 400

    prompt = data['prompt']
    
    if not API_KEY:
        # This is a fallback for local testing if the API key isn't set.
        # It returns a mock recipe to allow frontend development without a real API call.
        print("Warning: GEMINI_API_KEY not found. Returning mock data.")
        mock_recipe = {
            "name": "Mocktail Magic",
            "description": "A refreshing non-alcoholic drink for any occasion. This is mock data because the API key is not configured on the backend.",
            "ingredients": ["1 cup orange juice", "1/2 cup pineapple juice", "1/4 cup sparkling water", "1 tbsp grenadine", "Orange slice for garnish"],
            "instructions": ["Fill a glass with ice.", "Pour in the orange juice and pineapple juice.", "Top with sparkling water.", "Slowly pour in the grenadine.", "Garnish with an orange slice and enjoy!"]
        }
        return jsonify(mock_recipe)

    # --- This is the "Recipe Suggester" tool in our agent ---
    try:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
        
        # The prompt is carefully engineered to ask for a JSON response
        full_prompt = f"""
        Suggest a recipe based on this prompt: "{prompt}". 
        
        Structure the response as a single, valid JSON object with the following keys:
        - "name": a string for the recipe title.
        - "description": a brief, engaging string describing the dish.
        - "ingredients": an array of strings, where each string is one ingredient.
        - "instructions": an array of strings, where each string is one step of the instructions.
        
        Do not include any text or formatting outside of the JSON object itself.
        """

        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": full_prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
            }
        }

        response = requests.post(api_url, json=payload)
        response.raise_for_status()  # Raises an exception for bad status codes (4xx or 5xx)
        
        result = response.json()
        
        if result.get("candidates"):
            recipe_text = result["candidates"][0]["content"]["parts"][0]["text"]
            # The model should return a clean JSON string, which we can directly return
            return recipe_text, 200, {'Content-Type': 'application/json'}
        else:
            return jsonify({"error": "Could not generate a recipe from the model's response."}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": f"An error occurred while contacting the recipe service: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An unexpected server error occurred: {e}"}), 500


@app.route('/find-ingredients', methods=['POST'])
def find_ingredients():
    """
    This endpoint receives a list of ingredients and simulates checking
    their availability at a "last-mile" grocery service.
    """
    data = request.get_json()
    if not data or 'ingredients' not in data:
        return jsonify({"error": "Ingredient list is missing"}), 400

    ingredients = data['ingredients']
    shopping_list = []

    # --- This is the "Product Finder" tool in our agent ---
    for ingredient in ingredients:
        # Simulate an API call to a grocery service
        found = random.random() > 0.2  # 80% chance of finding the item
        shopping_list.append({
            "name": ingredient,
            "found": found,
            "status": 'Available' if found else 'Out of Stock'
        })

    return jsonify(shopping_list)

if __name__ == '__main__':
    # This allows the Flask app to run
    app.run(debug=True, port=5001)
