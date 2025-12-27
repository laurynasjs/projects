# ADK agents are optional - we use tools directly for now
# from google.adk.agents import LlmAgent
from tools.meal_generation import generate_meal_plan_tool
from config.settings import settings

# Simplified: Just use the tool function directly
# meal_planner_agent = generate_meal_plan_tool
