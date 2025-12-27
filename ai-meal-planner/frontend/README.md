# Frontend - AI Meal Planner

Simple HTML/JS frontend for the AI Meal Planner application.

## Structure

```
frontend/
├── index.html          # Main UI
└── README.md          # This file
```

## Running

The frontend is automatically served by the FastAPI backend.

### Start the backend:
```bash
cd /Users/laurynas.jasiukenas/Documents/projects/ai_planner
make backend-run
```

Then open: `http://localhost:8008/`

### Alternative: Run standalone (for development)
```bash
cd frontend
python3 -m http.server 3000
```
Note: You'll need to update `API_BASE` in index.html to `http://localhost:8008` for standalone mode.

## Configuration

The frontend connects to the backend API at:
```javascript
const API_BASE = 'http://localhost:8008';
```

Make sure the backend is running before using the frontend.

## How It Works

1. User enters meal preferences
2. Frontend calls `POST /api/generate-plan` on backend
3. Backend generates meal plan with AI
4. Frontend displays meal plan and shopping list
5. User clicks "Send to Barbora Extension"
6. Frontend dispatches `CustomEvent('shoppingListFromWebApp')`
7. Chrome extension receives event and processes shopping list

## Integration with Extension

The frontend communicates with the Chrome extension via `CustomEvent`:

```javascript
const event = new CustomEvent('shoppingListFromWebApp', {
    detail: { 
        items: [
            { name: "pienas", quantity: 1 },
            { name: "kiaušiniai", quantity: 2 }
        ]
    }
});
window.dispatchEvent(event);
```

The extension's content script listens for this event on the page.
