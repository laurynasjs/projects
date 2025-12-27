// src/content_script.ts
console.log('🔵 Content script starting to load...');

import { ShoppingListItem, FailedItem } from './shared/types';
import { CONFIG } from './shared/constants';
import { createLogger } from './shared/logger';
import { BarboraDOM } from './content/dom-helpers';

const logger = createLogger('CS');
console.log('🟢 Content script imports loaded, logger created');

async function performAddToCart(item: ShoppingListItem, retryCount: number = 0): Promise<void> {
    logger.info(`🛒 Adding "${item.name}" to cart (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES + 1})`);

    try {
        // Wait for product cards to load (no Shadow DOM needed)
        logger.info('⏳ Waiting for products to load...');
        await BarboraDOM.waitForElement(CONFIG.SELECTORS.PRODUCT_CARD);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Parse current search results
        logger.info('📋 Parsing search results...');
        const products = await parseSearchResults();

        logger.info(`✅ Found ${products.length} products total`);

        if (products.length === 0) {
            throw new Error('No products found on the page');
        }

        // Find available products and select best value by unit price
        const availableProducts = products.filter(p => p.available);

        logger.info(`✅ ${availableProducts.length} products available`);

        if (availableProducts.length === 0) {
            throw new Error('No available products found');
        }

        // Sort by unit price (lowest first)
        availableProducts.sort((a, b) => a.unitPrice - b.unitPrice);
        const bestProduct = availableProducts[0];

        logger.info(`🏆 Best value: ${bestProduct.name} - €${bestProduct.price} (€${bestProduct.unitPrice}/${bestProduct.unit})`);

        // Find button in regular DOM (no Shadow DOM)
        logger.info('🔍 Looking for Add to Cart button...');
        const productDiv = bestProduct.card.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
        if (!productDiv) {
            throw new Error('Product div not found');
        }

        const buttons = productDiv.querySelectorAll('button');
        let addButton: HTMLElement | null = null;

        for (const button of buttons) {
            const buttonText = button.textContent?.trim();
            logger.debug(`  Button text: "${buttonText}"`);
            if (buttonText?.includes(CONFIG.SELECTORS.ADD_TO_CART_TEXT)) {
                addButton = button as HTMLElement;
                logger.info(`✅ Found "Add to Cart" button!`);
                break;
            }
        }

        if (!addButton) {
            logger.error(`❌ Couldn't find button with text "${CONFIG.SELECTORS.ADD_TO_CART_TEXT}"`);
            throw new Error("Couldn't find 'Add to Cart' button");
        }

        logger.info('🖱️ Clicking "Add to Cart" button...');
        addButton.click();
        logger.info('✅ Button clicked!');

        if (item.quantity > 1) {
            logger.info(`🔢 Increasing quantity to ${item.quantity}...`);

            // Wait for the product card to update with quantity controls
            const waitForQuantityButton = async (maxWaitMs: number = 5000): Promise<HTMLElement | null> => {
                const startTime = Date.now();
                const checkInterval = 200;

                while (Date.now() - startTime < maxWaitMs) {
                    const increaseButtons = productDiv.querySelectorAll('button[aria-label*="Didinti"]');
                    if (increaseButtons.length > 0) {
                        logger.debug(`✅ Quantity button found after ${Date.now() - startTime}ms`);
                        return increaseButtons[0] as HTMLElement;
                    }
                    await new Promise(resolve => setTimeout(resolve, checkInterval));
                }

                logger.warn(`⚠️ Quantity button not found after ${maxWaitMs}ms`);
                return null;
            };

            const increaseBtn = await waitForQuantityButton();

            if (increaseBtn) {
                for (let i = 0; i < item.quantity - 1; i++) {
                    logger.debug(`Clicking increase button (${i + 1}/${item.quantity - 1})`);
                    increaseBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                logger.info(`✅ Quantity increased to ${item.quantity}`);
            } else {
                logger.warn('⚠️ Could not find quantity increase button - product added with quantity 1');
            }
        }

        logger.info(`✅ Successfully added "${item.name}" to cart!`);
        chrome.runtime.sendMessage({ action: "taskCompleted", status: "success" });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ Failed to add "${item.name}" to cart:`, error);

        if (retryCount < CONFIG.MAX_RETRIES) {
            logger.info(`🔄 Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await performAddToCart(item, retryCount + 1);
        } else {
            logger.error(`❌ Max retries reached for "${item.name}"`);
            chrome.runtime.sendMessage({
                action: "taskCompleted",
                status: "notFound",
                reason: errorMessage
            });
        }
    }
}

interface ParsedProduct {
    name: string;
    price: number;
    unitPrice: number;
    unit: string;
    available: boolean;
    quantity: number;
    card: Element;
}

async function parseSearchResults(): Promise<ParsedProduct[]> {
    logger.info('Parsing search results...');

    try {
        await BarboraDOM.waitForElement(CONFIG.SELECTORS.PRODUCT_CARD);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for content to render

        const cards = document.querySelectorAll(CONFIG.SELECTORS.PRODUCT_CARD);
        const products: ParsedProduct[] = [];

        logger.info(`Found ${cards.length} product cards`);

        for (const card of cards) {
            try {
                // NO SHADOW DOM - query directly in card
                const productDiv = card.querySelector(CONFIG.SELECTORS.SHADOW_HOST);
                if (!productDiv) {
                    logger.warn('Product div not found');
                    continue;
                }

                // DEBUG: Log first card HTML to see structure
                if (products.length === 0) {
                    logger.info('First product HTML (1000 chars):', productDiv.innerHTML.substring(0, 1000));
                }

                // Extract product name from link
                const linkElement = productDiv.querySelector('a[href*="/produktai/"]');
                const imgElement = productDiv.querySelector('img[alt]');
                const name = imgElement?.getAttribute('alt') || linkElement?.textContent?.trim() || 'Unknown';

                // Extract price from meta tag (most reliable)
                const priceMeta = productDiv.querySelector('meta[itemprop="price"]');
                let price = 0;
                if (priceMeta) {
                    const priceContent = priceMeta.getAttribute('content');
                    if (priceContent) {
                        price = parseFloat(priceContent);
                    }
                }

                // Extract unit price from text content
                const allText = productDiv.textContent || '';
                let unitPrice = 0;
                let unit = 'vnt';

                // Find unit price like "2,1€/l" or "2.1 €/kg"
                const unitPriceMatch = allText.match(/(\d+[,.]?\d*)\s*€\/(\w+)/);
                if (unitPriceMatch) {
                    unitPrice = parseFloat(unitPriceMatch[1].replace(',', '.'));
                    unit = unitPriceMatch[2];
                }

                // If no unit price, use main price
                if (unitPrice === 0) {
                    unitPrice = price;
                }

                // Check availability - look for "Add to Cart" button
                const buttons = productDiv.querySelectorAll('button');
                let available = false;
                for (const button of buttons) {
                    if (button.textContent?.includes(CONFIG.SELECTORS.ADD_TO_CART_TEXT)) {
                        available = true;
                        break;
                    }
                }

                if (price > 0) {
                    products.push({
                        name,
                        price,
                        unitPrice,
                        unit,
                        available,
                        quantity: 1,
                        card
                    });

                    logger.debug(`✅ Parsed: ${name} - €${price} (€${unitPrice}/${unit}) - ${available ? 'Available' : 'Out of stock'}`);
                }

            } catch (error) {
                logger.warn('Failed to parse product card', error);
            }
        }

        logger.info(`✅ Parsed ${products.length} products from search results`);
        return products;

    } catch (error) {
        logger.error('Failed to parse search results', error);
        return [];
    }
}

async function executeSearch(item: ShoppingListItem): Promise<void> {
    logger.info(`Executing search for: "${item.name}"`);

    try {
        const searchInput = await BarboraDOM.waitForElement(CONFIG.SELECTORS.SEARCH_INPUT) as HTMLInputElement;
        searchInput.value = item.name;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        const randomDelay = CONFIG.TIMEOUTS.SEARCH_DELAY_MIN +
            Math.random() * (CONFIG.TIMEOUTS.SEARCH_DELAY_MAX - CONFIG.TIMEOUTS.SEARCH_DELAY_MIN);
        logger.debug(`Waiting ${Math.round(randomDelay)}ms before clicking search`);
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        const searchButton = document.querySelector(CONFIG.SELECTORS.SEARCH_BUTTON) as HTMLElement;
        if (!searchButton) {
            throw new Error(`Could not find search button: ${CONFIG.SELECTORS.SEARCH_BUTTON}`);
        }

        searchButton.click();
        logger.info('✅ Search button clicked - page will reload with results');

    } catch (error) {
        logger.error('Failed to execute search', error);
        throw error;
    }
}

window.addEventListener('shoppingListFromWebApp', (event: Event) => {
    const customEvent = event as CustomEvent;
    logger.info('Received shopping list from Web App', customEvent.detail);
    chrome.runtime.sendMessage({ action: "startShoppingJob", items: customEvent.detail.items });
});

// Manual task handlers for testing mode
async function handleManualIncrease(): Promise<string> {
    try {
        logger.info('Manual: Increasing quantity');
        const cards = document.querySelectorAll(CONFIG.SELECTORS.PRODUCT_CARD);

        if (cards.length === 0) {
            return 'No products found on page';
        }

        await BarboraDOM.increaseQuantity(cards[0], 1);
        logger.info('Manual: Quantity increased');
        return 'Quantity increased';
    } catch (error) {
        logger.error('Manual increase failed', error);
        return `Error: ${error}`;
    }
}

async function handleManualDecrease(): Promise<string> {
    try {
        logger.info('Manual: Decreasing quantity');
        const cards = document.querySelectorAll(CONFIG.SELECTORS.PRODUCT_CARD);

        if (cards.length === 0) {
            return 'No products found on page';
        }

        // New structure: find decrease button directly in card
        const decreaseButton = await BarboraDOM.findButtonByAriaLabel(
            cards[0],
            CONFIG.SELECTORS.DECREASE_QUANTITY_ARIA
        );
        decreaseButton.click();
        logger.info('Manual: Quantity decreased');
        return 'Quantity decreased';
    } catch (error) {
        logger.error('Manual decrease failed', error);
        return `Error: ${error}`;
    }
}

async function handleManualRemove(): Promise<string> {
    try {
        logger.info('Manual: Removing from cart');
        const cards = document.querySelectorAll(CONFIG.SELECTORS.PRODUCT_CARD);

        if (cards.length === 0) {
            return 'No products found on page';
        }

        // New structure: find remove button directly in card
        const removeButton = cards[0].querySelector('button[aria-label*="Pašalinti"]');
        if (removeButton) {
            (removeButton as HTMLElement).click();
            logger.info('Manual: Removed from cart');
            return 'Removed from cart';
        }

        return 'Remove button not found';
    } catch (error) {
        logger.error('Manual remove failed', error);
        return `Error: ${error}`;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message received:', message.action);

    // Handle async operations properly
    const handleAsync = async () => {
        try {
            switch (message.action) {
                case "executeSearch":
                    console.log('🔍 Executing search for:', message.item.name);
                    await executeSearch(message.item);
                    return { status: "Search executed." };

                case "executeAddToCart":
                    console.log('🛒 Executing add to cart for:', message.item.name);
                    await performAddToCart(message.item);
                    return { status: "Add to cart initiated." };

                case "jobFinished":
                    const failedItems = message.failedItems as FailedItem[] || [];
                    if (failedItems.length > 0) {
                        const failedList = failedItems
                            .map(item => `• ${item.name}: ${item.reason}`)
                            .join('\n');
                        alert(`Shopping complete!\n\nFailed items (${failedItems.length}):\n${failedList}`);
                    } else {
                        alert('Shopping list has been processed successfully!');
                    }
                    logger.info('Job finished notification shown');
                    return { status: "acknowledged" };

                case "manualTask":
                    let result: string;
                    switch (message.task) {
                        case 'increase':
                            result = await handleManualIncrease();
                            break;
                        case 'decrease':
                            result = await handleManualDecrease();
                            break;
                        case 'remove':
                            result = await handleManualRemove();
                            break;
                        default:
                            result = 'Unknown task';
                    }
                    return { status: result };

                default:
                    logger.warn(`Unknown message action: ${message.action}`);
                    return { status: "unknown action" };
            }
        } catch (error) {
            logger.error('Error handling message', error);
            return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
        }
    };

    // Execute async handler and send response
    handleAsync()
        .then(response => {
            console.log('✅ Sending response:', response);
            sendResponse(response);
        })
        .catch(error => {
            console.error('❌ Handler error:', error);
            sendResponse({ status: "error", message: String(error) });
        });

    // Return true to indicate async response
    return true;
});

logger.info('Content script loaded and ready');
console.log('🚀 BARBORA EXTENSION LOADED - Content script is active!');

// Alert on first load to confirm extension is working
if (window.location.href.includes('barbora.lt')) {
    console.log('✅ On Barbora.lt - Extension ready to work');
}

export { };
