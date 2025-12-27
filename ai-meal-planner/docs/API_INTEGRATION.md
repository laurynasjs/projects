# API Integration Guide

## Backend REST API for Extension

This guide shows how the browser extension integrates with the backend API for multi-store price comparison.

## Workflow

```
1. User enters preferences in web UI
2. Frontend calls /api/generate-plan
3. Backend generates meal plan with ADK agents
4. Frontend receives meal plan + session_id
5. Extension checks prices across stores (Barbora, Rimi, Maxima)
6. Extension calls /api/price-report with prices
7. Backend analyzes prices and returns best store
8. Extension executes shopping on recommended store
```

## API Endpoints

### 1. Generate Meal Plan

**Endpoint:** `POST /api/generate-plan`

**Request:**
```json
{
  "preferences": "healthy low-budget meals for 2 people",
  "budget": 50.0,
  "days": 3,
  "dietary_restrictions": ["vegetarian"]
}
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "meal_plan": {
    "meals": [
      {
        "title": "Vištienos sriuba",
        "description": "Šilta ir maistinga sriuba",
        "ingredients": ["vištienos krūtinėlė 500g", "morkos 2 vnt"],
        "recipe": ["Supjaustykite daržoves", "Virinkite 30 min"],
        "key_protein": "vištienos krūtinėlė"
      }
    ],
    "shopping_list": ["vištienos krūtinėlė 500g", "morkos 2 vnt", "svogūnai 1 vnt"]
  },
  "message": "Meal plan generated. Please check prices across stores."
}
```

### 2. Report Prices

**Endpoint:** `POST /api/price-report`

**Request:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "prices": [
    {
      "ingredient": "vištienos krūtinėlė",
      "store": "barbora",
      "price": 5.99,
      "unit_price": 11.98,
      "unit": "kg",
      "url": "https://barbora.lt/...",
      "available": true
    },
    {
      "ingredient": "vištienos krūtinėlė",
      "store": "rimi",
      "price": 5.49,
      "unit_price": 10.98,
      "unit": "kg",
      "url": "https://rimi.lt/...",
      "available": true
    },
    {
      "ingredient": "vištienos krūtinėlė",
      "store": "maxima",
      "price": 5.79,
      "unit_price": 11.58,
      "unit": "kg",
      "url": "https://maxima.lt/...",
      "available": true
    }
  ],
  "timestamp": "2025-12-26T18:52:00Z"
}
```

**Response:**
```json
{
  "recommended_store": "rimi",
  "total_cost": 42.50,
  "total_savings": 3.50,
  "reason": "Rimi offers the best total price at €42.50. You save €3.50 compared to Barbora.",
  "comparisons": [
    {
      "store": "barbora",
      "total_cost": 46.00,
      "items_available": 10,
      "items_missing": 0,
      "savings": 3.50
    },
    {
      "store": "rimi",
      "total_cost": 42.50,
      "items_available": 10,
      "items_missing": 0,
      "savings": 0.0
    },
    {
      "store": "maxima",
      "total_cost": 44.20,
      "items_available": 10,
      "items_missing": 0,
      "savings": 1.70
    }
  ],
  "items": [
    {
      "name": "vištienos krūtinėlė",
      "quantity": 1,
      "price": 5.49,
      "unit_price": 10.98
    }
  ]
}
```

### 3. Get Session (Debug)

**Endpoint:** `GET /api/session/{session_id}`

**Response:**
```json
{
  "preferences": {...},
  "meal_plan": {...},
  "price_data": {...},
  "decision": {...},
  "status": "decision_made",
  "created_at": "2025-12-26T18:50:00Z"
}
```

### 4. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "active_sessions": 5,
  "timestamp": "2025-12-26T18:52:00Z"
}
```

## Extension Implementation

### TypeScript Types

```typescript
// extension/src/shared/types.ts
export interface PriceData {
  ingredient: string;
  store: string;
  price: number;
  unit_price: number;
  unit: string;
  url?: string;
  available: boolean;
}

export interface PriceReport {
  session_id: string;
  prices: PriceData[];
  timestamp: string;
}

export interface ShoppingDecision {
  recommended_store: string;
  total_cost: number;
  total_savings: number;
  reason: string;
  comparisons: StoreComparison[];
  items: ShoppingItem[];
}
```

### API Client

```typescript
// extension/src/services/api_client.ts
export class BackendAPI {
  private baseUrl = 'http://localhost:8000';
  
  async generateMealPlan(preferences: string): Promise<MealPlanResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences, days: 3 })
    });
    return response.json();
  }
  
  async reportPrices(report: PriceReport): Promise<ShoppingDecision> {
    const response = await fetch(`${this.baseUrl}/api/price-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    return response.json();
  }
}
```

### Usage in Extension

```typescript
// extension/src/content_script.ts
import { BackendAPI } from './services/api_client';
import { BarboraStore, RimiStore, MaximaStore } from './stores';

const api = new BackendAPI();

async function handleShoppingList(sessionId: string, items: string[]) {
  // Check prices across stores
  const stores = [new BarboraStore(), new RimiStore(), new MaximaStore()];
  const prices = [];
  
  for (const item of items) {
    for (const store of stores) {
      const products = await store.searchProduct(item);
      const best = store.getBestPrice(products);
      prices.push({
        ingredient: item,
        store: store.name.toLowerCase(),
        price: best.price,
        unit_price: best.unitPrice,
        unit: best.unit,
        url: best.url,
        available: best.available
      });
    }
  }
  
  // Send to backend
  const decision = await api.reportPrices({
    session_id: sessionId,
    prices,
    timestamp: new Date().toISOString()
  });
  
  // Execute shopping on recommended store
  const store = stores.find(s => s.name.toLowerCase() === decision.recommended_store);
  await executeShoppingOnStore(store, decision.items);
}
```

## Testing

### Test Backend Locally

```bash
# Start backend
make dev

# Test endpoints
curl http://localhost:8000/health

# Generate meal plan
curl -X POST http://localhost:8000/api/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"preferences": "healthy meals", "days": 3}'
```

### Test with Extension

1. Build extension: `make ext-build`
2. Load in Chrome
3. Open web UI at `http://localhost:8000`
4. Generate meal plan
5. Extension receives plan and checks prices
6. Backend returns best store recommendation

## Error Handling

```typescript
try {
  const decision = await api.reportPrices(report);
  // Handle success
} catch (error) {
  if (error.status === 404) {
    console.error('Session not found');
  } else if (error.status === 500) {
    console.error('Backend error:', error.message);
  }
}
```

## Environment Variables

```bash
# Backend .env
GEMINI_API_KEY=your_key_here
HOST=0.0.0.0
PORT=8000
GEMINI_MODEL=gemini-2.5-flash
```

## Next Steps

1. Implement multi-store scrapers in extension
2. Add price caching to reduce API calls
3. Add user authentication for saved preferences
4. Implement price history tracking
5. Add delivery options comparison
