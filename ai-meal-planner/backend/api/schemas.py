from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserPreferences(BaseModel):
    """User meal planning preferences."""
    preferences: str = Field(..., description="Natural language meal preferences")
    budget: Optional[float] = Field(None, description="Budget in EUR")
    days: int = Field(3, description="Number of days for meal plan")
    dietary_restrictions: list[str] = Field(default_factory=list)


class Ingredient(BaseModel):
    """Ingredient in a recipe."""
    name: str
    quantity: float = 1.0
    unit: Optional[str] = None


class Recipe(BaseModel):
    """Recipe steps."""
    steps: list[str]


class Meal(BaseModel):
    """A single meal in the plan."""
    title: str
    description: str
    ingredients: list[str]
    recipe: list[str]
    key_protein: Optional[str] = None


class MealPlan(BaseModel):
    """Complete meal plan."""
    meals: list[Meal]
    shopping_list: list[str]


class ProductPrice(BaseModel):
    """Price information for a product at a store."""
    ingredient: str
    store: str
    price: float
    unit_price: float
    unit: str
    url: Optional[str] = None
    available: bool = True


class PriceReport(BaseModel):
    """Price report from extension."""
    session_id: str
    prices: list[ProductPrice]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StoreComparison(BaseModel):
    """Comparison of prices across stores."""
    store: str
    total_cost: float
    items_available: int
    items_missing: int
    savings: float = 0.0


class ShoppingDecision(BaseModel):
    """Decision on where to shop."""
    recommended_store: str
    total_cost: float
    total_savings: float
    reason: str
    comparisons: list[StoreComparison]
    items: list[dict]


class ShoppingListItem(BaseModel):
    """Item in shopping list."""
    name: str
    quantity: float = 1.0


class GeneratePlanResponse(BaseModel):
    """Response from meal plan generation."""
    session_id: str
    meal_plan: MealPlan
    message: str = "Meal plan generated. Please check prices across stores."
