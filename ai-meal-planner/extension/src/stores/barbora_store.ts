import { BaseStore, Product, StoreConfig } from './base_store';
import { CONFIG } from '../shared/constants';

const BARBORA_CONFIG: StoreConfig = {
    name: 'Barbora',
    url: 'https://www.barbora.lt',
    selectors: {
        searchInput: CONFIG.SELECTORS.SEARCH_INPUT,
        searchButton: CONFIG.SELECTORS.SEARCH_BUTTON,
        productCard: CONFIG.SELECTORS.PRODUCT_CARD,
        priceElement: CONFIG.SELECTORS.UNIT_PRICE,
        addToCartButton: CONFIG.SELECTORS.ADD_TO_CART_TEXT,
    },
};

export class BarboraStore extends BaseStore {
    constructor() {
        super(BARBORA_CONFIG);
    }

    async search(query: string): Promise<void> {
        this.logger.info(`Searching for: "${query}"`);

        const searchInput = (await this.waitForElement(
            this.config.selectors.searchInput
        )) as HTMLInputElement;

        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        const randomDelay =
            CONFIG.TIMEOUTS.SEARCH_DELAY_MIN +
            Math.random() * (CONFIG.TIMEOUTS.SEARCH_DELAY_MAX - CONFIG.TIMEOUTS.SEARCH_DELAY_MIN);

        await new Promise((resolve) => setTimeout(resolve, randomDelay));

        const searchButton = document.querySelector(
            this.config.selectors.searchButton
        ) as HTMLElement;

        if (!searchButton) {
            throw new Error('Search button not found');
        }

        searchButton.click();
        this.logger.info('Search executed');
    }

    async getProducts(): Promise<Product[]> {
        // Wait for product cards to appear (li elements with data-testid="product-card-*")
        await this.waitForElement('li[data-testid^="product-card"]');

        // Additional small wait for all cards to render
        await new Promise(resolve => setTimeout(resolve, 500));

        const cards = document.querySelectorAll('li[data-testid^="product-card"]');
        this.logger.info(`Found ${cards.length} product card elements`);

        const products: Product[] = [];

        for (const card of cards) {
            try {
                const product = this.extractProductFromCard(card);
                if (product) {
                    products.push(product);
                }
            } catch (error) {
                this.logger.warn('Failed to extract product from card', error);
            }
        }

        this.logger.info(`Successfully extracted ${products.length} products from ${cards.length} cards`);
        return products;
    }

    private extractProductFromCard(card: Element): Product | null {
        // Find the div with data-b-for-cart attribute containing JSON product data
        const dataDiv = card.querySelector('[data-b-for-cart]');
        if (!dataDiv) {
            this.logger.warn('No data-b-for-cart element found');
            return null;
        }

        const jsonData = dataDiv.getAttribute('data-b-for-cart');
        if (!jsonData) {
            this.logger.warn('No JSON data in data-b-for-cart');
            return null;
        }

        try {
            const data = JSON.parse(jsonData);

            // Extract product information from JSON
            const name = data.title || 'Unknown Product';
            const price = data.price || 0;
            const unitPrice = data.comparative_unit_price || price;
            const unit = data.comparative_unit || 'vnt';
            const imageUrl = data.image || data.big_image;
            const available = data.status === 'active';

            // Check for promotion/discount
            const hasDiscount = !!(data.promotion || data.promotionGroup);
            const promotionPrice = hasDiscount ? price : undefined;

            return {
                name,
                price,
                unitPrice,
                unit,
                url: window.location.href,
                available,
                imageUrl,
                element: card,
                hasDiscount,
                promotionPrice,
            };
        } catch (error) {
            this.logger.warn('Failed to parse product JSON', error);
            return null;
        }
    }

    async addToCart(product: Product, quantity: number = 1): Promise<void> {
        this.logger.info(`Adding "${product.name}" to cart (quantity: ${quantity})`);

        if (!product.element) {
            throw new Error('Product element not available');
        }

        // Find "Add to Cart" button with data-cnstrc-btn="add_to_cart"
        const addButton = product.element.querySelector('button[data-cnstrc-btn="add_to_cart"]') as HTMLElement;

        if (!addButton) {
            throw new Error('Add to cart button not found');
        }

        addButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        // TODO: Implement quantity adjustment if needed
        // For now, we just add to cart once
        if (quantity > 1) {
            this.logger.warn(`Quantity adjustment not yet implemented for Barbora (requested: ${quantity})`);
        }

        this.logger.info('Product added to cart');
    }

    private async findButtonByAriaLabel(
        parent: ShadowRoot | HTMLElement,
        ariaLabel: string
    ): Promise<HTMLElement> {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeWaited = 0;
            const timeout = 7000;

            const interval = setInterval(() => {
                const element = parent.querySelector(`[aria-label="${ariaLabel}"]`);
                if (element) {
                    const clickable = element.closest('button, [role="button"]');
                    if (clickable) {
                        clearInterval(interval);
                        resolve(clickable as HTMLElement);
                        return;
                    }
                }

                timeWaited += intervalTime;
                if (timeWaited >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`Button with aria-label "${ariaLabel}" not found`));
                }
            }, intervalTime);
        });
    }
}
