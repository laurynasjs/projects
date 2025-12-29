// API client for FastAPI backend
const API_BASE = import.meta.env.DEV ? '/api' : '/api';

export async function generateMealPlan(preferences, days = null) {
    const response = await fetch(`${API_BASE}/generate-plan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences, days }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

export function sendToExtension(items, store = 'barbora') {
    // Dispatch custom event for Chrome extension
    const event = new CustomEvent('shoppingListFromWebApp', {
        detail: { items, store }
    });
    window.dispatchEvent(event);

    // Also store in localStorage for extension to pick up
    localStorage.setItem('mealPlannerCart', JSON.stringify({
        items,
        store,
        timestamp: Date.now()
    }));
}

export function checkPrices(items, store = 'barbora') {
    const event = new CustomEvent('priceCheckFromWebApp', {
        detail: { items, store }
    });
    window.dispatchEvent(event);
}
