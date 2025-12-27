import { createLogger } from '../shared/logger';

const logger = createLogger('API');

export interface MealPlanResponse {
    session_id: string;
    meal_plan: {
        meals: Array<{
            title: string;
            description: string;
            ingredients: string[];
            recipe: string[];
            key_protein?: string;
        }>;
        shopping_list: string[];
    };
    message: string;
}

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
    comparisons: Array<{
        store: string;
        total_cost: number;
        items_available: number;
        items_missing: number;
        savings: number;
    }>;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        unit_price: number;
    }>;
}

export class BackendAPI {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:8008') {
        this.baseUrl = baseUrl;
    }

    async generateMealPlan(preferences: string, days: number = 3): Promise<MealPlanResponse> {
        logger.info('Requesting meal plan generation');

        try {
            const response = await fetch(`${this.baseUrl}/api/generate-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences, days })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            logger.info(`Meal plan generated with session: ${data.session_id}`);
            return data;
        } catch (error) {
            logger.error('Failed to generate meal plan', error);
            throw error;
        }
    }

    async reportPrices(report: PriceReport): Promise<ShoppingDecision> {
        logger.info(`Reporting prices for session: ${report.session_id}`);

        try {
            const response = await fetch(`${this.baseUrl}/api/price-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            logger.info(`Received decision: Shop at ${data.recommended_store}`);
            return data;
        } catch (error) {
            logger.error('Failed to report prices', error);
            throw error;
        }
    }

    async getSession(sessionId: string): Promise<any> {
        logger.info(`Fetching session: ${sessionId}`);

        try {
            const response = await fetch(`${this.baseUrl}/api/session/${sessionId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            logger.error('Failed to get session', error);
            throw error;
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch (error) {
            logger.error('Health check failed', error);
            return false;
        }
    }
}
