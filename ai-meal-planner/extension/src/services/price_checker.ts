import { StoreFactory, StoreName } from '../stores';
import { Product } from '../stores/base_store';
import { BackendAPI, PriceData, PriceReport } from './api_client';
import { createLogger } from '../shared/logger';

const logger = createLogger('PriceChecker');

export interface PriceCheckResult {
    ingredient: string;
    stores: Map<StoreName, Product | null>;
}

export class PriceChecker {
    private api: BackendAPI;

    constructor(apiBaseUrl?: string) {
        this.api = new BackendAPI(apiBaseUrl);
    }

    /**
     * Check prices for a single ingredient across all stores
     */
    async checkIngredientPrices(
        ingredient: string,
        stores: StoreName[] = ['barbora', 'rimi', 'maxima']
    ): Promise<PriceCheckResult> {
        logger.info(`Checking prices for: ${ingredient}`);

        const result: PriceCheckResult = {
            ingredient,
            stores: new Map()
        };

        for (const storeName of stores) {
            try {
                const store = StoreFactory.getStore(storeName);

                // Open store in new tab
                const tab = await chrome.tabs.create({ url: store.url, active: false });

                if (!tab.id) {
                    logger.error(`Failed to create tab for ${storeName}`);
                    result.stores.set(storeName, null);
                    continue;
                }

                // Wait for tab to load and search
                await this.waitForTabLoad(tab.id);

                // Execute search in the tab
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'searchProduct',
                    query: ingredient,
                    store: storeName
                });

                // Get products
                const products = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getProducts',
                    store: storeName
                });

                // Find best product
                const bestProduct = store.getBestValueProduct(products);
                result.stores.set(storeName, bestProduct);

                // Close tab
                await chrome.tabs.remove(tab.id);

            } catch (error) {
                logger.error(`Error checking ${storeName} for ${ingredient}`, error);
                result.stores.set(storeName, null);
            }
        }

        return result;
    }

    /**
     * Check prices for multiple ingredients across all stores
     */
    async checkMultipleIngredients(
        ingredients: string[],
        stores: StoreName[] = ['barbora', 'rimi', 'maxima']
    ): Promise<Map<string, PriceCheckResult>> {
        logger.info(`Checking prices for ${ingredients.length} ingredients across ${stores.length} stores`);

        const results = new Map<string, PriceCheckResult>();

        for (const ingredient of ingredients) {
            const result = await this.checkIngredientPrices(ingredient, stores);
            results.set(ingredient, result);

            // Small delay between ingredients to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    /**
     * Check prices and report to backend
     */
    async checkAndReport(
        sessionId: string,
        ingredients: string[],
        stores: StoreName[] = ['barbora', 'rimi', 'maxima']
    ): Promise<any> {
        logger.info(`Starting price check for session: ${sessionId}`);

        // Check prices
        const results = await this.checkMultipleIngredients(ingredients, stores);

        // Convert to price data format
        const priceData: PriceData[] = [];

        for (const [ingredient, result] of results.entries()) {
            for (const [storeName, product] of result.stores.entries()) {
                if (product) {
                    priceData.push({
                        ingredient,
                        store: storeName,
                        price: product.price,
                        unit_price: product.unitPrice,
                        unit: product.unit,
                        url: product.url,
                        available: product.available
                    });
                } else {
                    // Report unavailable item
                    priceData.push({
                        ingredient,
                        store: storeName,
                        price: 0,
                        unit_price: 0,
                        unit: 'vnt',
                        available: false
                    });
                }
            }
        }

        // Report to backend
        const report: PriceReport = {
            session_id: sessionId,
            prices: priceData,
            timestamp: new Date().toISOString()
        };

        logger.info(`Reporting ${priceData.length} price points to backend`);
        const decision = await this.api.reportPrices(report);

        logger.info(`Backend recommendation: ${decision.recommended_store} (save €${decision.total_savings.toFixed(2)})`);

        return decision;
    }

    private async waitForTabLoad(tabId: number, timeout: number = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkStatus = () => {
                chrome.tabs.get(tabId, (tab) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (tab.status === 'complete') {
                        resolve();
                    } else if (Date.now() - startTime > timeout) {
                        reject(new Error('Tab load timeout'));
                    } else {
                        setTimeout(checkStatus, 100);
                    }
                });
            };

            checkStatus();
        });
    }
}
