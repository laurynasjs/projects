import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "active_sessions" in data


def test_root_endpoint():
    """Test root endpoint returns HTML."""
    response = client.get("/")
    assert response.status_code == 200
    assert "AI Meal Planner API" in response.text


def test_generate_plan():
    """Test meal plan generation endpoint."""
    payload = {
        "preferences": "healthy meals for 2 people",
        "days": 3
    }
    
    response = client.post("/api/generate-plan", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "session_id" in data
    assert "meal_plan" in data
    assert "shopping_list" in data["meal_plan"]


def test_price_report_invalid_session():
    """Test price report with invalid session ID."""
    payload = {
        "session_id": "invalid-session-id",
        "prices": []
    }
    
    response = client.post("/api/price-report", json=payload)
    assert response.status_code == 404
