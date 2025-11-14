# # webapp/app.py
# import os
# import time
# import json
# import logging
# from flask import Flask, render_template, request, jsonify
# import google.generativeai as genai
# from dotenv import load_dotenv

# # Load environment variables from .env file
# load_dotenv()

# # --- Configuration ---
# app = Flask(__name__)
# logging.basicConfig(level=logging.INFO,
#                     format='%(asctime)s - %(levelname)s - %(message)s')

# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# PRICE_THRESHOLD_EUR = 8.0 

# # --- Mock Scraper (Updated with Lithuanian Keys) ---
# def get_mock_price(item_name: str) -> float:
#     app.logger.info(f"MOCK SCRAPER: Received request for: {item_name}")
#     time.sleep(1.5) 
    
#     mock_prices = {
#         "vištienos krūtinėlė": 9.99,
#         "lašišos filė": 15.99,
#         "malta jautiena": 7.50,
#         "kiaulienos nugarinė": 6.99,
#         "kalakutienos krūtinėlė": 8.50,
#         "tofu": 5.50
#     }
#     price = mock_prices.get(item_name.lower(), 20.0)
#     app.logger.info(f"MOCK SCRAPER: Found price: €{price}/kg")
#     return price

# # --- Gemini API Interaction ---
# generation_config = {
#     "temperature": 0.7,
#     "response_mime_type": "application/json",
# }
# model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config)

# # --- Flask Routes ---
# @app.route('/')
# def index():
#     return render_template('index.html')

# @app.route('/generate-plan', methods=['POST'])
# def generate_plan():
#     try:
#         user_preferences = request.json.get('preferences', 'a standard 3-day meal plan')
#         app.logger.info(f"FLASK: Received request for: {user_preferences}")

#         # --- Step 1: Generate the Initial Meal Plan (Prompt updated for Lithuanian) ---
#         prompt_1 = f"""
#         You are a helpful meal planning assistant for a user in Lithuania.
#         Generate a 3-day meal plan based on the following user preferences: "{user_preferences}".

#         For each meal, provide:
#         1. A "title" in Lithuanian.
#         2. A short "description" in Lithuanian.
#         3. A "recipe" as a list of strings, in Lithuanian.
#         4. An "ingredients" list as an array of strings, IN LITHUANIAN.
#         5. A "key_protein" which is the single most significant protein ingredient, IN LITHUANIAN (e.g., "vištienos krūtinėlė", "lašišos filė").

#         Return the entire plan as a single JSON object with a key "meal_plan" which is a list of the 3 meals.
#         """
#         app.logger.info("FLASK: Sending Prompt #1 to Gemini API...")
#         response_1 = model.generate_content(prompt_1)
#         initial_plan = json.loads(response_1.text)
#         app.logger.info("FLASK: Received initial plan from Gemini.")

#         final_plan = []
#         for meal in initial_plan.get('meal_plan', []):
#             key_protein = meal.get('key_protein')
            
#             if not key_protein:
#                 final_plan.append(meal)
#                 continue

#             # price = get_mock_price(key_protein)

#             # if price > PRICE_THRESHOLD_EUR:
#             #     app.logger.warning(f"FLASK: Price for '{key_protein}' (€{price}) is high. Requesting substitution.")
#             #     prompt_2 = f"""
#             #     The following meal recipe has a key ingredient, '{key_protein}', which is currently expensive at €{price}/kg.
#             #     Suggest a suitable, cheaper protein alternative (like pork or turkey), IN LITHUANIAN.
#             #     Provide an updated meal with a new "title", "description", "recipe", and "ingredients" list, all IN LITHUANIAN.
#             #     Ensure the output is a single JSON object representing the new meal.

#             #     Original Meal JSON:
#             #     {json.dumps(meal, ensure_ascii=False)}
#             #     """
#             #     app.logger.info("FLASK: Sending Prompt #2 to Gemini API for refinement...")
#             #     response_2 = model.generate_content(prompt_2)
#             #     refined_meal = json.loads(response_2.text)
#             #     final_plan.append(refined_meal)
#             #     app.logger.info("FLASK: Received refined meal from Gemini.")
#             # else:
#             #     app.logger.info(f"FLASK: Price for '{key_protein}' (€{price}) is acceptable.")
#             #     final_plan.append(meal)
#             # app.logger.info(f"FLASK: Price for '{key_protein}' (€{price}) is acceptable.")
#             final_plan.append(meal)     
        
#         # --- CORRECTED: Aggregate the final shopping list ---
#         shopping_list = []
#         for meal in final_plan:
#             for ingredient in meal.get('ingredients', []):
#                 shopping_list.append(ingredient)

#         # Return both the plan and the final list
#         return jsonify({"meal_plan": final_plan, "shopping_list": shopping_list})

#     except Exception as e:
#         app.logger.error(f"FLASK: An error occurred: {e}", exc_info=True)
#         return jsonify({"error": str(e)}), 500

# if __name__ == '__main__':
#     app.run(debug=True, port=5000)

# webapp/app.py
import os
import json
import logging
import re
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
app = Flask(__name__)
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# --- Gemini API Interaction ---
generation_config = {
    "temperature": 0.7,
    "response_mime_type": "application/json",
}
model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config=generation_config)

# --- Helper function to clean and parse JSON from LLM response ---
def parse_json_from_response(text: str) -> dict:
    """
    Cleans the text response from the LLM and parses it into a Python dictionary.
    Removes markdown code blocks and other potential garbage.
    """
    # Find the JSON block using a regular expression
    match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        # If no markdown block, assume the whole text is the JSON
        json_str = text

    # Attempt to parse the cleaned string
    return json.loads(json_str)


# --- Flask Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    try:
        user_preferences = request.json.get('preferences', 'a standard 3-day meal plan')
        app.logger.info(f"FLASK: Received request for: {user_preferences}")

        # --- Generate the Meal Plan ---
        prompt_1 = f"""
        You are a helpful meal planning assistant for a user in Lithuania.
        Generate a 3-day meal plan based on the following user preferences: "{user_preferences}".

        For each meal, provide:
        1. A "title" in Lithuanian.
        2. A short "description" in Lithuanian.
        3. A "recipe" as a list of strings, in Lithuanian.
        4. An "ingredients" list as an array of strings, IN LITHUANIAN.
        5. A "key_protein" which is the single most significant protein ingredient, IN LITHUANIAN (e.g., "vištienos krūtinėlė", "lašišos filė").

        Return the entire plan as a single JSON object with a key "meal_plan" which is a list of the 3 meals.
        """
        app.logger.info("FLASK: Sending Prompt to Gemini API...")
        response_1 = model.generate_content(prompt_1)
        
        app.logger.info(f"FLASK: RAW GEMINI RESPONSE: {response_1.text}")
        initial_plan = parse_json_from_response(response_1.text) # Use the robust parser
        app.logger.info("FLASK: Received and parsed initial plan from Gemini.")

        # --- Aggregate the final shopping list ---
        final_plan = initial_plan.get('meal_plan', [])
        shopping_list = []
        for meal in final_plan:
            for ingredient in meal.get('ingredients', []):
                shopping_list.append(ingredient)

        return jsonify({"meal_plan": final_plan, "shopping_list": shopping_list})

    except Exception as e:
        app.logger.error(f"FLASK: An error occurred: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
