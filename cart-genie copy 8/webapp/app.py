# webapp/app.py
import os
import time
import json
import logging
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
app = Flask(__name__)

# --- NEW: Proper Logging Setup ---
# Configure logging to show timestamp, level, and message
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# This is our price threshold. Any protein ingredient above this price will trigger a substitution.
PRICE_THRESHOLD_EUR = 8.0 

# --- Mock Scraper ---
# In a real application, this would trigger a separate worker (e.g., Playwright/Scrapy).
# For now, it simulates the process of finding an item's price.
def get_mock_price(item_name: str) -> float:
    """
    Simulates a web scraper to get the price of an item.
    Returns the price per kg.
    """
    app.logger.info(f"MOCK SCRAPER: Received request to find price for: {item_name}")
    # Simulate network delay
    time.sleep(1.5) 
    
    # Pre-defined prices to simulate a real store's inventory
    mock_prices = {
        "chicken breast": 9.99,
        "salmon fillet": 15.99,
        "ground beef": 7.50,
        "pork loin": 6.99,
        "turkey breast": 8.50,
        "tofu": 5.50
    }
    # Return the price if found, otherwise a default high price
    price = mock_prices.get(item_name.lower(), 20.0)
    app.logger.info(f"MOCK SCRAPER: Found price: €{price}/kg")
    return price

# --- Gemini API Interaction ---
generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
    "response_mime_type": "application/json",
}
# --- CORRECTED: Updated the model name to a current version ---
model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config=generation_config)

# --- Flask Routes ---
@app.route('/')
def index():
    """Renders the main HTML page."""
    return render_template('index.html')

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    """
    The main API endpoint that orchestrates the meal plan generation.
    """
    try:
        user_preferences = request.json.get('preferences', 'a standard 3-day meal plan')
        app.logger.info(f"FLASK: Received request for: {user_preferences}")

        # --- Step 1: Generate the Initial Meal Plan ---
        prompt_1 = f"""
        You are a helpful meal planning assistant for a user in Lithuania.
        Generate a 3-day meal plan based on the following user preferences: "{user_preferences}".

        For each meal, provide:
        1. A "title".
        2. A short "description".
        3. A "recipe" as a list of strings.
        4. An "ingredients" list as an array of strings.
        5. A "key_protein" which is the single most significant protein ingredient (e.g., "chicken breast", "salmon fillet", "tofu").

        Return the entire plan as a single JSON object with a key "meal_plan" which is a list of the 3 meals.
        """
        app.logger.info("FLASK: Sending Prompt #1 to Gemini API...")
        response_1 = model.generate_content(prompt_1)
        initial_plan = json.loads(response_1.text)
        app.logger.info("FLASK: Received initial plan from Gemini.")

        final_plan = []
        # --- Step 2 & 3: Check Prices and Refine Each Meal ---
        for meal in initial_plan.get('meal_plan', []):
            key_protein = meal.get('key_protein')
            
            if not key_protein:
                final_plan.append(meal)
                continue

            price = get_mock_price(key_protein)

            # Decision Logic: If the price is above our threshold, ask for a substitute.
            if price > PRICE_THRESHOLD_EUR:
                app.logger.warning(f"FLASK: Price for '{key_protein}' (€{price}) is above threshold. Requesting substitution.")
                prompt_2 = f"""
                The following meal recipe has a key ingredient, '{key_protein}', which is currently expensive at €{price}/kg.
                Suggest a suitable, cheaper protein alternative (like pork, turkey, or a vegetarian option).
                Provide an updated meal with a new "title", "description", "recipe", and "ingredients" list based on this substitution.
                Ensure the output is a single JSON object representing the new meal.

                Original Meal JSON:
                {json.dumps(meal)}
                """
                app.logger.info("FLASK: Sending Prompt #2 to Gemini API for refinement...")
                response_2 = model.generate_content(prompt_2)
                refined_meal = json.loads(response_2.text)
                final_plan.append(refined_meal)
                app.logger.info("FLASK: Received refined meal from Gemini.")
            else:
                # If the price is fine, just add the original meal to our final plan.
                app.logger.info(f"FLASK: Price for '{key_protein}' (€{price}) is acceptable.")
                final_plan.append(meal)
        
        return jsonify({"meal_plan": final_plan})

    except Exception as e:
        app.logger.error(f"FLASK: An error occurred: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
