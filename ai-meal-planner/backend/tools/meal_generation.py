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
    You are a helpful meal planning assistant for a user in Lithuania who shops at Barbora.lt.
    
    User request: "{preferences}"
    
    {day_instruction}

    CRITICAL INSTRUCTIONS:
    - Understand the user's needs naturally (e.g., "this week" = 7 meals, "today" = 1 meal, "3 dinners" = 3 meals)
    - If unclear, provide 3 meals as a reasonable default
    - ALL text MUST be in Lithuanian language
    - Consider dietary preferences, budget constraints, and number of people if mentioned
    
    INGREDIENT FORMATTING RULES (EXTREMELY IMPORTANT):
    - ALL ingredient names MUST be in Lithuanian (e.g., "pienas" not "milk", "vištienos krūtinėlė" not "chicken breast")
    - Use SIMPLE, COMMON Lithuanian product names that are searchable on Barbora.lt
    - Format: "[ingredient name] [quantity][unit]" (e.g., "pienas 1l", "morkos 500g", "kiaušiniai 6vnt")
    - Use standard units: g (gramai), kg (kilogramai), l (litrai), ml (mililitrai), vnt (vienetai)
    - Use lowercase for ingredient names (except proper nouns)
    - NO spaces in compound words unless commonly used (e.g., "vištienos krūtinėlė" not "vištiena krūtinėlė")
    
    QUANTITY PRECISION:
    - Use grams (g) for items under 1kg: "morkos 500g" not "morkos 0.5kg"
    - Use kg for items 1kg and above: "bulvės 2kg" not "bulvės 2000g"
    - Use liters (l) for liquids 1L and above: "pienas 1l" not "pienas 1000ml"
    - Use ml for liquids under 1L: "aliejus 50ml" not "aliejus 0.05l"
    - Round to practical amounts: "500g" not "487g"
    
    SKIP QUANTITIES FOR THESE ITEMS (sold in standard packages):
    - Spices/seasonings: "druska", "pipirai", "česnakų milteliai", "kmynai", "cinamonas", "bazilikas", "oregano"
    - Condiments: "kečupas", "majonezes", "garstyčios", "actas"
    - Baking: "kepimo milteliai", "mielės", "vanilinis cukrus", "cukraus pudra"
    - Small packaged items: "želatina", "soda", "citrinų rūgštis"
    - Format: just the name without quantity (e.g., "druska" not "druska 5g")
    
    PLURAL/SINGULAR RULES:
    - Use plural form for countable items: "morkos" not "morka", "svogūnai" not "svogūnas"
    - Use singular for uncountable: "pienas", "mėsa", "druska"
    - Exception: meat cuts use genitive: "vištienos krūtinėlė", "jautienos nugarinė"
    
    COMMON BARBORA.LT PRODUCT NAMES (use these exact terms):
    - Dairy: "pienas", "grietinė", "jogurtas", "sūris", "sviestas", "varškė" (WITH quantities)
    - Meat: "vištienos krūtinėlė", "kiaulienos nugarinė", "jautienos maltiniai", "lašiniai" (WITH quantities)
    - Vegetables: "morkos", "svogūnai", "bulvės", "pomidorai", "agurkai", "paprikos" (WITH quantities)
    - Grains: "ryžiai", "makaronai", "duona", "miltai" (WITH quantities)
    - Spices: "druska", "pipirai", "česnakų milteliai", "kmynai" (NO quantities - sold in standard packages)
    - Condiments: "kečupas", "majonezes", "garstyčios" (NO quantities - sold in standard bottles)
    - Oils: "aliejus", "alyvuogių aliejus", "saulėgrąžų aliejus" (WITH quantities if large amounts)
    
    Examples of GOOD formatting:
      ✓ "vištienos krūtinėlė 500g" (meat, genitive, grams)
      ✓ "pienas 1l" (liquid, singular, liters)
      ✓ "morkos 3vnt" (countable, plural, pieces)
      ✓ "svogūnai 2vnt" (countable, plural)
      ✓ "aliejus 50ml" (liquid, small amount)
      ✓ "druska" (spice, NO quantity - standard package)
      ✓ "pipirai" (spice, NO quantity - standard package)
      ✓ "ryžiai 500g" (grain, practical amount)
    
    Examples of BAD formatting:
      ✗ "chicken breast 500g" (English)
      ✗ "Vištienos krūtinėlė, šviežia, 500 gramų" (too descriptive)
      ✗ "500g vištienos" (quantity before name)
      ✗ "morka 1vnt" (wrong singular form)
      ✗ "pienas 0.5l" (use 500ml instead)
      ✗ "bulvės 2000g" (use 2kg instead)
      ✗ "druska 5g" (spices should have NO quantity)
      ✗ "pipirai 10g" (spices should have NO quantity)
      ✗ "kečupas 200ml" (condiments should have NO quantity)
    
    For each meal, provide:
    1. "title" - Meal name in Lithuanian
    2. "description" - Short description in Lithuanian (1-2 sentences)
    3. "recipe" - Step-by-step cooking instructions in Lithuanian (array of strings)
    4. "ingredients" - List of ingredients with quantities in Lithuanian, following the format above
    5. "key_protein" - Main protein source in Lithuanian (simple name only)

    Also provide "shopping_list" - All unique ingredients needed across all meals, IN LITHUANIAN, following the same format rules.
    Combine duplicate ingredients (e.g., if 2 meals need milk, sum the quantities).

    Return ONLY valid JSON in this exact format:
    {{
        "meal_plan": [
            {{
                "title": "Vištienos sriuba su daržovėmis",
                "description": "Šilta ir maistinga sriuba su šviežiomis daržovėmis",
                "recipe": ["Supjaustykite daržoves kubeliais", "Pakepinkite svogūnus", "Įdėkite vištienos ir virinkite 30 min"],
                "ingredients": ["vištienos krūtinėlė 500g", "morkos 2vnt", "svogūnai 1vnt", "bulvės 3vnt", "druska", "pipirai"],
                "key_protein": "vištienos krūtinėlė"
            }}
        ],
        "shopping_list": ["vištienos krūtinėlė 500g", "morkos 2vnt", "svogūnai 1vnt", "bulvės 3vnt", "druska", "pipirai"]
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
