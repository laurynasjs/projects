import json
import re
import google.generativeai as genai
from config.settings import settings

# Configure the API
genai.configure(api_key=settings.gemini_api_key)


def parse_json_from_response(text: str) -> dict:
    """Clean and parse JSON from LLM response."""
    match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        json_str = text
    return json.loads(json_str)


def generate_meal_plan_tool(preferences: str, days: int = None) -> dict:
    """
    Generate a meal plan based on user preferences.
    
    Args:
        preferences: Natural language user query (e.g., "plan meals for this week")
        days: Optional specific number of days (if None, AI decides from query)
        
    Returns:
        Dictionary containing meal plan and shopping list
    """
    config = {
        "temperature": settings.temperature,
    }
    
    # Let AI decide meal count if not specified
    if days:
        day_instruction = f"Generate exactly {days} meals."
    else:
        day_instruction = "Understand how many meals the user needs from their request."
    
    prompt = f"""
    You are a helpful meal planning assistant for a user in Lithuania.
    
    User request: "{preferences}"
    
    {day_instruction}

    Instructions:
    - Understand the user's needs naturally (e.g., "this week" = 7 meals, "today" = 1 meal, "3 dinners" = 3 meals)
    - If unclear, provide 3 meals as a reasonable default
    - All text must be in Lithuanian
    - Consider dietary preferences, budget constraints, and number of people if mentioned
    
    For each meal, provide:
    1. "title" - Meal name in Lithuanian
    2. "description" - Short description in Lithuanian
    3. "recipe" - Step-by-step instructions in Lithuanian
    4. "ingredients" - List of ingredients with quantities in Lithuanian
    5. "key_protein" - Main protein source in Lithuanian

    Also provide "shopping_list" - All unique ingredients needed, IN LITHUANIAN.

    Return ONLY valid JSON in this exact format:
    {{
        "meal_plan": [
            {{
                "title": "Vištienos sriuba",
                "description": "Šilta ir maistinga sriuba",
                "recipe": ["Supjaustykite daržoves", "Virinkite 30 min"],
                "ingredients": ["vištienos krūtinėlė 500g", "morkos 2 vnt", "svogūnai 1 vnt"],
                "key_protein": "vištienos krūtinėlė"
            }}
        ],
        "shopping_list": ["vištienos krūtinėlė 500g", "morkos 2 vnt", "svogūnai 1 vnt"]
    }}
    """
    
    model = genai.GenerativeModel(settings.gemini_model)
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=config["temperature"],
        )
    )
    result = parse_json_from_response(response.text)
    
    return result
