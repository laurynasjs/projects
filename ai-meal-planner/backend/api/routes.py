from fastapi import APIRouter, HTTPException
from typing import Dict, Optional
from pydantic import BaseModel
import uuid
import logging
from datetime import datetime

from api.schemas import (
    UserPreferences,
    PriceReport,
    ShoppingDecision,
    GeneratePlanResponse,
    MealPlan,
)
from tools.meal_generation import generate_meal_plan_tool
from tools.price_analysis import analyze_prices_tool, select_best_store_tool

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage for sessions (use Redis/DB in production)
sessions: Dict[str, dict] = {}


class GeneratePlanRequest(BaseModel):
    """Request model for meal plan generation."""
    preferences: str
    days: Optional[int] = None  # Let AI decide from user query


@router.post("/api/generate-plan", response_model=GeneratePlanResponse)
async def generate_plan(request: GeneratePlanRequest):
    """
    Generate a meal plan based on user preferences.
    Returns a session ID for tracking the shopping workflow.
    """
    try:
        logger.info(f"Generating meal plan for query: {request.preferences}")
        
        # Generate meal plan using Gemini (AI decides days if not specified)
        result = generate_meal_plan_tool(
            preferences=request.preferences,
            days=request.days  # None = AI decides
        )
        
        # Create session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "preferences": request.preferences,
            "meal_plan": result,
            "created_at": datetime.utcnow(),
            "status": "meal_plan_ready"
        }
        
        # Format response
        meal_plan = MealPlan(
            meals=result["meal_plan"],
            shopping_list=result["shopping_list"]
        )
        
        return GeneratePlanResponse(
            session_id=session_id,
            meal_plan=meal_plan,
            message="Meal plan generated. Please check prices across stores."
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating meal plan: {str(e)}")


@router.post("/api/price-report", response_model=ShoppingDecision)
async def receive_price_report(price_report: PriceReport):
    """
    Receive price data from extension and return shopping decision.
    Extension calls this after checking prices across stores.
    """
    try:
        session_id = price_report.session_id
        
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = sessions[session_id]
        
        # Store price data
        session["price_data"] = price_report.dict()
        session["status"] = "prices_received"
        
        # Analyze prices using ADK tool
        price_data_list = [p.dict() for p in price_report.prices]
        analysis = analyze_prices_tool(price_data=price_data_list)
        
        # Select best store using ADK tool
        decision = select_best_store_tool(
            analysis=analysis,
            user_preferences=session["preferences"]
        )
        
        # Store decision
        session["decision"] = decision
        session["status"] = "decision_made"
        
        # Format response
        return ShoppingDecision(**decision)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing prices: {str(e)}")


@router.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session data for debugging/monitoring."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return sessions[session_id]


@router.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Clean up session data."""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session deleted"}
    
    raise HTTPException(status_code=404, detail="Session not found")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "active_sessions": len(sessions),
        "timestamp": datetime.utcnow().isoformat()
    }
