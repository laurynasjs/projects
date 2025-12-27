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

    async searchProduct(query: string): Promise<void> {
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
        await this.waitForElement(this.config.selectors.productCard);
        const cards = document.querySelectorAll(this.config.selectors.productCard);

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

        this.logger.info(`Found ${products.length} products`);
        return products;
    }

    private extractProductFromCard(card: Element): Product | null {
        const shadowHost = card.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
        if (!shadowHost || !shadowHost.shadowRoot) {
            return null;
        }

        // Get unit price from Shadow DOM
        const unitPriceElement = shadowHost.shadowRoot.querySelector(
            CONFIG.SELECTORS.UNIT_PRICE
        );
        if (!unitPriceElement || !unitPriceElement.textContent) {
            return null;
        }

        const priceText = unitPriceElement.textContent.split('€')[0].replace(',', '.').trim();
        const unitPrice = this.parsePrice(priceText);

        if (unitPrice === Infinity) {
            return null;
        }

        // Get product name from Shadow DOM
        const titleElement = shadowHost.shadowRoot.querySelector('.product-title, h3, .title');
        const name = titleElement?.textContent?.trim() || 'Unknown Product';

        // Extract unit (kg, l, vnt, etc.)
        const unitMatch = unitPriceElement.textContent.match(/€\/(\w+)/);
        const unit = unitMatch ? unitMatch[1] : 'vnt';

        // For now, assume price = unitPrice (we'd need to extract actual price separately)
        const price = unitPrice;

        return {
            name,
            price,
            unitPrice,
            unit,
            url: window.location.href,
            available: true,
            element: card,
        };
    }

    async addToCart(product: Product, quantity: number = 1): Promise<void> {
        this.logger.info(`Adding "${product.name}" to cart (quantity: ${quantity})`);

        if (!product.element) {
            throw new Error('Product element not available');
        }

        const shadowHost = product.element.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
        if (!shadowHost || !shadowHost.shadowRoot) {
            throw new Error('Shadow DOM not found');
        }

        // Find "Add to Cart" button in Shadow DOM
        const buttons = shadowHost.shadowRoot.querySelectorAll('button');
        let addButton: HTMLElement | null = null;

        for (const button of buttons) {
            if (button.textContent?.trim() === CONFIG.SELECTORS.ADD_TO_CART_TEXT) {
                addButton = button as HTMLElement;
                break;
            }
        }

        if (!addButton) {
            throw new Error('Add to cart button not found');
        }

        addButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Increase quantity if needed
        if (quantity > 1) {
            await this.increaseQuantity(shadowHost.shadowRoot, quantity - 1);
        }

        this.logger.info('Product added to cart');
    }

    private async increaseQuantity(shadowRoot: ShadowRoot, times: number): Promise<void> {
        const increaseButton = await this.findButtonByAriaLabel(
            shadowRoot,
            CONFIG.SELECTORS.INCREASE_QUANTITY_ARIA
        );

        for (let i = 0; i < times; i++) {
            increaseButton.click();
            await new Promise((resolve) => setTimeout(resolve, CONFIG.TIMEOUTS.QUANTITY_CLICK_DELAY));
        }
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
