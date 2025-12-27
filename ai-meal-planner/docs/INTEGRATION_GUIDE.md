# Backend → Frontend → Extension Integration Guide

## Architecture Overview

```
User Input → FastAPI Backend → Frontend HTML → Chrome Extension → Barbora.lt
```

## Components

### 1. **Backend (FastAPI)**
- **Location:** `/Users/laurynas.jasiukenas/Documents/projects/ai_planner/backend`
- **Endpoint:** `POST /api/generate-plan`
- **Port:** 8008
- **Function:** Generates meal plan using Gemini AI, returns shopping list

### 2. **Frontend (HTML)**
- **Location:** `/Users/laurynas.jasiukenas/Documents/projects/ai_planner/frontend/index.html`
- **URL:** `http://localhost:8008/` (served by backend)
- **Function:** 
  - Displays UI for meal planning
  - Calls backend API on same server
  - Sends shopping list to extension via `CustomEvent`

### 3. **Extension (Chrome)**
- **Location:** `/Users/laurynas.jasiukenas/Documents/projects/ai_planner/extension`
- **Function:**
  - Listens for `shoppingListFromWebApp` event
  - Processes shopping list items
  - Searches and adds products to Barbora cart

## How to Test End-to-End

### Step 1: Start Backend (serves frontend too!)
```bash
cd /Users/laurynas.jasiukenas/Documents/projects/ai_planner
make backend-run
```
Server will start on `http://localhost:8008` (serves both API and frontend)

### Step 2: Load Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `/Users/laurynas.jasiukenas/Documents/projects/ai_planner/extension/dist`

### Step 3: Open Frontend
1. Navigate to `http://localhost:8008/`
2. You should see "AI Meal Planner" interface

### Step 4: Generate Meal Plan
1. Enter preferences (e.g., "Plan 3 healthy meals for 2 people")
2. Click "Generate Meal Plan"
3. Wait for AI to generate plan (10-30 seconds)
4. Review meal plan and shopping list

### Step 5: Send to Extension
1. Review shopping list items (uncheck any you don't want)
2. Click "🛒 Send to Barbora Extension" button
3. Frontend dispatches `CustomEvent('shoppingListFromWebApp')`

### Step 6: Extension Processes List
1. Extension content script receives event
2. Forwards to background script
3. Background script starts shopping job
4. For each item:
   - Opens Barbora search page
   - Searches for item
   - Parses products
   - Selects best value (lowest unit price)
   - Adds to cart
   - Increases quantity if needed

### Step 7: Verify Results
1. Check Barbora cart at `https://barbora.lt/cart`
2. All items should be added automatically
3. Check console logs for debugging

## Event Flow

```javascript
// Frontend sends:
const event = new CustomEvent('shoppingListFromWebApp', {
    detail: { 
        items: [
            { name: "pienas", quantity: 1 },
            { name: "kiaušiniai", quantity: 2 }
        ]
    }
});
window.dispatchEvent(event);

// Extension receives:
window.addEventListener('shoppingListFromWebApp', (event) => {
    const items = event.detail.items;
    chrome.runtime.sendMessage({ 
        action: "startShoppingJob", 
        items: items 
    });
});
```

## Troubleshooting

### Backend not responding
- Check if backend is running: `curl http://localhost:8008/health`
- Check logs for errors
- Verify Gemini API key is set in `.env`

### Extension not receiving events
- Open DevTools on frontend page (F12)
- Check Console for event dispatch logs
- Verify extension is loaded and active
- Check extension console for errors

### Items not added to cart
- Open Barbora page first: `https://barbora.lt/`
- Check extension console logs
- Verify selectors are correct (Barbora may change HTML)
- Check if products are available

## Current Features

✅ **Backend:**
- Meal plan generation with Gemini AI
- Shopping list extraction
- Session management

✅ **Frontend:**
- User-friendly meal planning interface
- Shopping list preview with checkboxes
- Direct send to extension

✅ **Extension:**
- Event listener for webapp integration
- Bulk shopping list processing
- Smart product selection (best value by unit price)
- Quantity parsing from search (e.g., "pienas/2")
- Automatic quantity increase after adding to cart

## Next Steps

1. **Test the full flow** with a simple meal plan
2. **Add error handling** for failed searches
3. **Implement price comparison** across multiple stores (Barbora, Rimi, Maxima)
4. **Add progress tracking** in frontend UI
5. **Store shopping history** for analytics

## API Reference

### POST /api/generate-plan
**Request:**
```json
{
  "preferences": "healthy meals for 2 people",
  "days": 3
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "meal_plan": {
    "meals": [...],
    "shopping_list": ["pienas", "kiaušiniai", "duona"]
  },
  "message": "Meal plan generated"
}
```
