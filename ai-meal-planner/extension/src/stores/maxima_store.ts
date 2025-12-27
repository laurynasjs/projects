import { BaseStore, Product, StoreConfig } from './base_store';

const MAXIMA_CONFIG: StoreConfig = {
    name: 'Maxima',
    url: 'https://www.maxima.lt',
    selectors: {
        searchInput: 'input[type="search"], #search-input',
        searchButton: 'button[type="submit"], .search-button',
        productCard: '.product-item, .product-card',
        priceElement: '.price, .product-price',
        addToCartButton: 'Į krepšelį',
    },
};

export class MaximaStore extends BaseStore {
    constructor() {
        super(MAXIMA_CONFIG);
    }

    async searchProduct(query: string): Promise<void> {
        this.logger.info(`Searching for: "${query}"`);

        // Navigate to search
        if (!window.location.href.includes('/paieska')) {
            window.location.href = `${this.config.url}/paieska?q=${encodeURIComponent(query)}`;
            return;
        }

        const searchInput = (await this.waitForElement(
            this.config.selectors.searchInput
        )) as HTMLInputElement;

        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 500));

        const searchButton = document.querySelector(
            this.config.selectors.searchButton
        ) as HTMLElement;

        if (searchButton) {
            searchButton.click();
        } else {
            searchInput.form?.submit();
        }

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
        // Extract product name
        const nameElement = card.querySelector('.product-name, .product-title, h3');
        const name = nameElement?.textContent?.trim() || 'Unknown Product';

        // Extract price
        const priceElement = card.querySelector(this.config.selectors.priceElement);
        if (!priceElement || !priceElement.textContent) {
            return null;
        }

        const priceText = priceElement.textContent;
        const price = this.parsePrice(priceText);

        if (price === Infinity) {
            return null;
        }

        // Extract unit price
        const unitPriceElement = card.querySelector('.unit-price, .price-unit');
        let unitPrice = price;
        let unit = 'vnt';

        if (unitPriceElement && unitPriceElement.textContent) {
            unitPrice = this.parsePrice(unitPriceElement.textContent);
            const unitMatch = unitPriceElement.textContent.match(/\/(\w+)/);
            unit = unitMatch ? unitMatch[1] : 'vnt';
        }

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

        // Find add to cart button
        const buttons = product.element.querySelectorAll('button');
        let addButton: HTMLElement | null = null;

        for (const button of buttons) {
            const text = button.textContent?.trim().toLowerCase();
            if (text?.includes('krepšel') || text?.includes('cart') || text?.includes('pridėti')) {
                addButton = button as HTMLElement;
                break;
            }
        }

        if (!addButton) {
            throw new Error('Add to cart button not found');
        }

        addButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Handle quantity
        if (quantity > 1) {
            const quantityInput = product.element.querySelector(
                'input[type="number"]'
            ) as HTMLInputElement;

            if (quantityInput) {
                quantityInput.value = quantity.toString();
                quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        this.logger.info('Product added to cart');
    }
}
