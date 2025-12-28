# AI Meal Planner - React Frontend

Modern React frontend for the AI Meal Planner application.

## Features

- 🎨 Beautiful UI with Tailwind CSS
- ⚡ Fast development with Vite
- 🔄 Real-time meal plan generation
- 📱 Tabbed Navigation (Ideas, Menu, Shop)
- 🥗 Interactive Menu Selection
- 🛒 Editable Shopping List
- 🔌 Chrome extension integration
- 📱 Responsive design

## Setup

```bash
# Install dependencies
npm install

# Start development server (with proxy to backend)
npm run dev

# Build for production
npm run build
```

## Development

The dev server runs on `http://localhost:3000` and proxies API calls to the FastAPI backend at `http://localhost:8008`.

Make sure the backend is running:
```bash
cd ../..
make dev
```

## Architecture

```
src/
├── api/
│   └── client.js          # FastAPI backend client
├── components/
│   ├── ChatInput.jsx      # Message input
│   ├── QuickPrompts.jsx   # Quick prompt buttons
│   ├── MenuCard.jsx       # Meal plan display
│   ├── IngredientsCard.jsx # Shopping list
│   └── RecipeCarousel.jsx # Recipe suggestions
├── lib/
│   └── utils.js           # Utility functions
├── App.jsx                # Main app component
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## Integration with Backend

The React app calls these FastAPI endpoints:

- `POST /api/generate-plan` - Generate meal plan
  - Request: `{ preferences: string, days?: number }`
  - Response: `{ session_id, meal_plan: { meals, shopping_list } }`

## Extension Integration

The app sends shopping lists to the Chrome extension via:
1. `CustomEvent('shoppingListFromWebApp')` - Event dispatch
2. `localStorage.setItem('mealPlannerCart')` - Fallback storage

## Differences from Design POC

- Removed Base44 ADK dependency (used direct FastAPI calls)
- Simplified conversation flow (single request/response)
- Removed real-time streaming (can be added later)
- Kept the beautiful UI and component structure
