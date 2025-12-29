import { BaseStore, Product, StoreConfig } from './base_store';

const IKI_CONFIG: StoreConfig = {
    name: 'IKI',
    url: 'https://www.lastmile.lt/chain/IKI',
    selectors: {
        searchInput: 'input[data-testid="navigation-search-input"]',
        searchButton: 'button[type="submit"]',
        productCard: 'a[href*="/product/"]',
        priceElement: '[class*="price"]',
        addToCartButton: 'button',
    }
};

export class IKIStore extends BaseStore {
    constructor() {
        super(IKI_CONFIG);
    }

    async search(searchTerm: string): Promise<void> {
        this.logger.info(`Searching for: "${searchTerm}"`);

        const searchInput = (await this.waitForElement(
            this.config.selectors.searchInput
        )) as HTMLInputElement;

        searchInput.value = '';
        searchInput.focus();
        searchInput.value = searchTerm;

        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 400));

        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
        });
        searchInput.dispatchEvent(enterEvent);

        this.logger.info('Search initiated');
    }

    async getProducts(): Promise<Product[]> {
        await this.waitForElement(this.config.selectors.productCard, 10000);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cards = document.querySelectorAll(this.config.selectors.productCard);
        const products: Product[] = [];

        this.logger.info(`Found ${cards.length} product cards`);

        for (const card of cards) {
            try {
                const product = await this.parseProductCard(card);
                if (product) {
                    products.push(product);
                }
            } catch (error) {
                this.logger.error('Error parsing product card', error);
            }
        }

        return products;
    }

    private async parseProductCard(card: Element): Promise<Product | null> {
        try {
            // IKI uses link elements as product cards
            const linkElement = card as HTMLAnchorElement;
            const productUrl = linkElement.href || '';

            // Product name is in the img alt attribute
            const imageElement = card.querySelector('img');
            const name = imageElement?.alt?.trim() || '';

            if (!name) {
                this.logger.debug('No product name found in img alt, skipping card');
                return null;
            }

            // Find all text nodes that contain prices (format: €X.XX or X,XX €)
            const allText = card.textContent || '';
            const priceMatches = allText.match(/€?\s*(\d+[.,]\d{2})\s*€?/g) || [];

            let price = 0;
            let unitPrice = 0;

            if (priceMatches.length > 0 && priceMatches[0]) {
                // First price is usually the main price
                const priceText = priceMatches[0].replace(/€/g, '').trim();
                price = parseFloat(priceText.replace(',', '.'));

                // Second price might be unit price
                if (priceMatches.length > 1 && priceMatches[1]) {
                    const unitPriceText = priceMatches[1].replace(/€/g, '').trim();
                    unitPrice = parseFloat(unitPriceText.replace(',', '.'));
                } else {
                    unitPrice = price;
                }
            }

            // Try to find unit from text
            const unitMatch = allText.match(/(\d+[.,]?\d*)\s*(kg|l|ml|g|vnt)/i);
            const unit = unitMatch ? unitMatch[2].toLowerCase() : 'vnt';

            // Check availability - look for "out of stock" indicators
            const unavailableText = allText.toLowerCase();
            const available = !unavailableText.includes('išparduota') &&
                !unavailableText.includes('nėra') &&
                !card.querySelector('[class*="unavailable"], [class*="disabled"]');

            // Image URL
            const imageUrl = imageElement?.src || imageElement?.getAttribute('data-src') || '';

            this.logger.debug(`Parsed IKI product: ${name} - €${price} (€${unitPrice}/${unit})`);

            return {
                name,
                price,
                unitPrice,
                unit,
                available,
                imageUrl: imageUrl,
                url: productUrl
            };
        } catch (error) {
            this.logger.error('Error parsing IKI product card', error);
            return null;
        }
    }

    async addToCart(product: Product, quantity: number = 1): Promise<void> {
        this.logger.info(`Adding ${quantity}x "${product.name}" to cart`);

        const cards = document.querySelectorAll(this.config.selectors.productCard);
        let targetCard: Element | null = null;

        for (const card of cards) {
            const nameElement = card.querySelector('[data-testid*="product-name"], h2, h3, .product-name');
            if (nameElement?.textContent?.trim() === product.name) {
                targetCard = card;
                break;
            }
        }

        if (!targetCard) {
            throw new Error('Product card not found');
        }

        const addButton = targetCard.querySelector(this.config.selectors.addToCartButton) as HTMLElement;

        if (!addButton) {
            throw new Error('Add to cart button not found');
        }

        addButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        if (quantity > 1) {
            const increaseButton = targetCard.querySelector('button[aria-label*="Didinti"], button[data-testid*="increase"]') as HTMLElement;

            if (increaseButton) {
                for (let i = 1; i < quantity; i++) {
                    increaseButton.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }

        this.logger.info('Product added to cart');
    }
}
