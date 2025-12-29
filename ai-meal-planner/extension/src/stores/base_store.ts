import { createLogger } from '../shared/logger';

const logger = createLogger('Store');

export interface Product {
    name: string;
    price: number;
    unitPrice: number;
    unit: string;
    url: string;
    available: boolean;
    imageUrl?: string;
    element?: Element;
}

export interface StoreConfig {
    name: string;
    url: string;
    selectors: {
        searchInput: string;
        searchButton: string;
        productCard: string;
        priceElement: string;
        addToCartButton: string;
    };
    timeouts?: {
        searchDelay?: number;
        elementWait?: number;
    };
}

export abstract class BaseStore {
    public config: StoreConfig;
    protected logger: ReturnType<typeof createLogger>;

    constructor(config: StoreConfig) {
        this.config = config;
        this.logger = createLogger(`Store:${config.name}`);
    }

    get name(): string {
        return this.config.name;
    }

    get url(): string {
        return this.config.url;
    }

    // Abstract methods that each store must implement
    abstract search(searchTerm: string): Promise<void>;
    abstract getProducts(): Promise<Product[]>;
    abstract addToCart(product: Product, quantity: number): Promise<void>;

    /**
     * Get the best value product (lowest unit price)
     */
    getBestValueProduct(products: Product[]): Product | null {
        if (products.length === 0) return null;

        let bestProduct: Product | null = null;
        let lowestUnitPrice = Infinity;

        for (const product of products) {
            if (product.available && product.unitPrice < lowestUnitPrice) {
                lowestUnitPrice = product.unitPrice;
                bestProduct = product;
            }
        }

        return bestProduct;
    }

    /**
     * Check if we're currently on this store's website
     */
    isCurrentStore(): boolean {
        return window.location.href.includes(this.config.url);
    }

    /**
     * Wait for element to appear
     */
    protected async waitForElement(
        selector: string,
        timeout: number = 7000
    ): Promise<Element> {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeWaited = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(interval);
                    this.logger.debug(`Found element: ${selector}`);
                    resolve(element);
                } else {
                    timeWaited += intervalTime;
                    if (timeWaited >= timeout) {
                        clearInterval(interval);
                        reject(new Error(`Timeout waiting for: ${selector}`));
                    }
                }
            }, intervalTime);
        });
    }

    /**
     * Parse price from text
     */
    protected parsePrice(priceText: string): number {
        const cleaned = priceText.replace(/[^\d,.-]/g, '').replace(',', '.');
        const price = parseFloat(cleaned);
        return isNaN(price) ? Infinity : price;
    }
}
