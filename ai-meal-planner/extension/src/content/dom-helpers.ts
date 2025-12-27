import { CONFIG } from '../shared/constants';
import { createLogger } from '../shared/logger';

const logger = createLogger('DOM');

export class BarboraDOM {
    static async waitForElement(selector: string, timeout: number = CONFIG.TIMEOUTS.ELEMENT_WAIT): Promise<Element> {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeWaited = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(interval);
                    logger.debug(`Found element: ${selector}`);
                    resolve(element);
                } else {
                    timeWaited += intervalTime;
                    if (timeWaited >= timeout) {
                        clearInterval(interval);
                        const error = new Error(`Timed out waiting for: ${selector} after ${timeout}ms`);
                        logger.error('Element wait timeout', error);
                        reject(error);
                    }
                }
            }, intervalTime);
        });
    }

    static async findButtonByAriaLabel(
        parentElement: HTMLElement | ShadowRoot | Element,
        ariaLabel: string,
        timeout: number = CONFIG.TIMEOUTS.ELEMENT_WAIT
    ): Promise<HTMLElement> {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeWaited = 0;
            const interval = setInterval(() => {
                const elementWithLabel = parentElement.querySelector(`[aria-label="${ariaLabel}"]`);
                if (elementWithLabel) {
                    const clickableElement = elementWithLabel.closest('button, [role="button"]');
                    if (clickableElement) {
                        clearInterval(interval);
                        logger.debug(`Found button with aria-label: ${ariaLabel}`);
                        resolve(clickableElement as HTMLElement);
                        return;
                    }
                }
                timeWaited += intervalTime;
                if (timeWaited >= timeout) {
                    clearInterval(interval);
                    const error = new Error(`Could not find clickable element for aria-label "${ariaLabel}" after ${timeout}ms`);
                    logger.error('Button search timeout', error);
                    reject(error);
                }
            }, intervalTime);
        });
    }

    static getUnitPriceFromCard(card: Element): number {
        try {
            // Shadow DOM is attached by JS - need to wait for it
            const shadowHost = card.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
            if (shadowHost && shadowHost.shadowRoot) {
                const unitPriceElement = shadowHost.shadowRoot.querySelector(CONFIG.SELECTORS.UNIT_PRICE);
                if (unitPriceElement && unitPriceElement.textContent) {
                    const priceText = unitPriceElement.textContent.split('€')[0].replace(',', '.').trim();
                    const price = parseFloat(priceText);
                    if (isNaN(price)) {
                        logger.warn(`Invalid price format: ${priceText}`);
                        return Infinity;
                    }
                    return price;
                }
            }
        } catch (error) {
            logger.error('Error extracting unit price', error);
        }
        return Infinity;
    }

    static async findAddToCartButton(card: Element): Promise<HTMLElement | null> {
        try {
            const shadowHost = card.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
            if (shadowHost && shadowHost.shadowRoot) {
                const buttons = shadowHost.shadowRoot.querySelectorAll('button');
                for (const button of buttons) {
                    if (button.textContent?.trim() === CONFIG.SELECTORS.ADD_TO_CART_TEXT) {
                        logger.debug('Found "Add to Cart" button in Shadow DOM');
                        return button as HTMLElement;
                    }
                }
            }
        } catch (error) {
            logger.error('Error finding add to cart button', error);
        }
        return null;
    }

    static async increaseQuantity(card: Element, times: number): Promise<void> {
        try {
            const shadowHost = card.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
            if (shadowHost && shadowHost.shadowRoot) {
                // Wait for quantity controls to appear after adding to cart
                await new Promise(resolve => setTimeout(resolve, 500));

                const increaseButton = await this.findButtonByAriaLabel(
                    shadowHost.shadowRoot,
                    CONFIG.SELECTORS.INCREASE_QUANTITY_ARIA
                );

                for (let i = 0; i < times; i++) {
                    (increaseButton as HTMLElement).click();
                    logger.debug(`Increased quantity: ${i + 1}/${times}`);
                    await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.QUANTITY_CLICK_DELAY));
                }
            }
        } catch (error) {
            logger.error('Error increasing quantity', error);
            throw error;
        }
    }

    static async findBestValueProduct(): Promise<{ card: Element; price: number } | null> {
        try {
            await this.waitForElement(CONFIG.SELECTORS.PRODUCT_CARD);
            const allCards = document.querySelectorAll(CONFIG.SELECTORS.PRODUCT_CARD);

            if (allCards.length === 0) {
                logger.warn('No product cards found');
                return null;
            }

            let bestCard: Element | null = null;
            let lowestPrice = Infinity;

            for (const card of allCards) {
                const unitPrice = this.getUnitPriceFromCard(card);
                if (unitPrice < lowestPrice) {
                    lowestPrice = unitPrice;
                    bestCard = card;
                }
            }

            if (bestCard && lowestPrice !== Infinity) {
                logger.info(`Best value found: €${lowestPrice.toFixed(2)}`);
                return { card: bestCard, price: lowestPrice };
            }

            return null;
        } catch (error) {
            logger.error('Error finding best value product', error);
            throw error;
        }
    }
}
