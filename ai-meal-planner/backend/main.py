"""
AI Meal Planner Backend
FastAPI application with ADK agents for meal planning and price comparison.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
import logging
from pathlib import Path

from config.settings import settings
from api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Meal Planner",
    description="Multi-store meal planning with AI-powered price comparison",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

# Setup templates
templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(templates_dir))

# Mount frontend static files
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the frontend UI."""
    # Try to serve from frontend directory first
    frontend_index = Path(__file__).parent.parent / "frontend" / "index.html"
    if frontend_index.exists():
        return FileResponse(frontend_index)
    
    # Fallback to templates directory
    index_path = templates_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    
    # Fallback to API info if template not found
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Meal Planner API</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
            code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>🍽️ AI Meal Planner API</h1>
        <p>Multi-store meal planning with AI-powered price comparison</p>
        
        <h2>API Endpoints</h2>
        
        <div class="endpoint">
            <strong>POST /api/generate-plan</strong>
            <p>Generate a meal plan based on user preferences</p>
            <code>{"preferences": "healthy meals for 2 people", "days": 3}</code>
        </div>
        
        <div class="endpoint">
            <strong>POST /api/price-report</strong>
            <p>Submit price data from extension and get shopping decision</p>
            <code>{"session_id": "...", "prices": [...]}</code>
        </div>
        
        <div class="endpoint">
            <strong>GET /api/session/{session_id}</strong>
            <p>Get session data</p>
        </div>
        
        <div class="endpoint">
            <strong>GET /health</strong>
            <p>Health check</p>
        </div>
        
        <h2>Documentation</h2>
        <ul>
            <li><a href="/docs">Swagger UI (Interactive API Docs)</a></li>
            <li><a href="/redoc">ReDoc (Alternative Docs)</a></li>
        </ul>
        
        <h2>Workflow</h2>
        <ol>
            <li>User sends preferences to <code>/api/generate-plan</code></li>
            <li>Backend generates meal plan with ADK agents</li>
            <li>Extension receives meal plan and checks prices across stores</li>
            <li>Extension sends prices to <code>/api/price-report</code></li>
            <li>Backend analyzes prices and returns best store recommendation</li>
            <li>Extension executes shopping on recommended store</li>
        </ol>
    </body>
    </html>
    """


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("🚀 AI Meal Planner API starting...")
    logger.info(f"📍 Running on {settings.host}:{settings.port}")
    logger.info(f"🤖 Using model: {settings.gemini_model}")
    logger.info(f"🏪 Supported stores: {', '.join(settings.supported_stores)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("👋 AI Meal Planner API shutting down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level="info"
    )
