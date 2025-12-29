// src/content_script.ts
console.log('🔵 Content script starting to load...');

import { ShoppingListItem, FailedItem, ScrapedProduct, MessageAction } from './shared/types';
import { CONFIG } from './shared/constants';
import { createLogger } from './shared/logger';
import { BarboraDOM } from './content/dom-helpers';
import { parseIngredient, parsePackageSize, calculatePackagesNeeded } from './shared/ingredient-parser';
import { StoreFactory, BaseStore } from './stores';
import { rankProducts } from './shared/product-matcher';

const logger = createLogger('CS');
console.log('🟢 Content script imports loaded, logger created');

// Detect current store
const currentStore = StoreFactory.getCurrentStore();
if (currentStore) {
    logger.info(`🏪 Detected store: ${currentStore.config.name}`);
} else {
    logger.warn('⚠️ Could not detect store - extension may not work properly');
}

// Internal interface for DOM operations
interface ParsedProduct extends ScrapedProduct {
    card: Element;
}

async function performAddToCart(item: ShoppingListItem, retryCount: number = 0): Promise<void> {
    logger.info(`🛒 Adding "${item.name}" to cart (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES + 1})`);

    try {
        let bestProduct: ParsedProduct;
        let calculatedQuantity: number;

        // Check if we have a cached product from carousel selection
        if (item.cachedProduct) {
            logger.info('✅ Using cached product from carousel - skipping search!');
            logger.info(`   Product: ${item.cachedProduct.name}`);
            logger.info(`   Price: €${item.cachedProduct.price}`);

            // Wait for products to load
            await BarboraDOM.waitForElement(CONFIG.SELECTORS.PRODUCT_CARD);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Find the exact product on page
            const parsedForSearch = parseIngredient(item.name);
            const products = await parseSearchResults(parsedForSearch.name);
            const matchedProduct = products.find(p =>
                p.name === item.cachedProduct!.name &&
                Math.abs(p.price - item.cachedProduct!.price) < 0.01
            );

            if (!matchedProduct) {
                throw new Error('Cached product not found on page - may have changed');
            }

            bestProduct = matchedProduct;

            // Calculate quantity for cached product
            const parsed = parseIngredient(item.name);
            const packageInfo = parsePackageSize(bestProduct.name);

            if (packageInfo && parsed.unit !== 'none') {
                calculatedQuantity = calculatePackagesNeeded(
                    parsed.neededAmount,
                    parsed.unit,
                    packageInfo.size,
                    packageInfo.unit,
                    parsed.name
                );
                logger.info(`📦 Need ${calculatedQuantity} package(s)`);
            } else {
                calculatedQuantity = 1;
            }
        } else {
            // Original flow: search for best product
            logger.info('⏳ Waiting for products to load...');
            await BarboraDOM.waitForElement(CONFIG.SELECTORS.PRODUCT_CARD);
            await new Promise(resolve => setTimeout(resolve, 500));

            logger.info('📋 Parsing search results...');
            const parsedForSearch2 = parseIngredient(item.name);
            const products = await parseSearchResults(parsedForSearch2.name);

            logger.info(`✅ Found ${products.length} products total`);

            if (products.length === 0) {
                throw new Error('No products found on the page');
            }

            const availableProducts = products.filter(p => p.available);

            logger.info(`✅ ${availableProducts.length} products available`);

            if (availableProducts.length === 0) {
                throw new Error('No available products found');
            }

            const parsed = parseIngredient(item.name);
            logger.info(`📊 Recipe needs: ${parsed.neededAmount}${parsed.unit} of "${parsed.name}"`);

            availableProducts.sort((a, b) => a.unitPrice - b.unitPrice);
            bestProduct = availableProducts[0];

            const packageInfo = parsePackageSize(bestProduct.name);

            if (packageInfo && parsed.unit !== 'none') {
                calculatedQuantity = calculatePackagesNeeded(
                    parsed.neededAmount,
                    parsed.unit,
                    packageInfo.size,
                    packageInfo.unit,
                    parsed.name
                );
                logger.info(`📦 Package size: ${packageInfo.size}${packageInfo.unit} → Need ${calculatedQuantity} package(s)`);
            } else {
                logger.info(`📦 No package size detected or no quantity needed → Adding 1 package`);
                calculatedQuantity = 1;
            }

            logger.info(`🏆 Best value: ${bestProduct.name} - €${bestProduct.price} (€${bestProduct.unitPrice}/${bestProduct.unit})`);
        }

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

        if (calculatedQuantity > 1) {
            logger.info(`🔢 Increasing quantity to ${calculatedQuantity} packages...`);

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
                for (let i = 0; i < calculatedQuantity - 1; i++) {
                    logger.debug(`Clicking increase button (${i + 1}/${calculatedQuantity - 1})`);
                    increaseBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                logger.info(`✅ Quantity increased to ${calculatedQuantity} packages`);
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

async function parseSearchResults(searchQuery: string): Promise<ParsedProduct[]> {
    logger.info('Parsing search results...');

    try {
        if (!currentStore) {
            throw new Error('No store detected - cannot parse products');
        }

        // Use store-specific getProducts method
        const storeProducts = await currentStore.getProducts();
        logger.info(`✅ Store returned ${storeProducts.length} products`);

        // Rank products and limit to top 6 (best match + 2 discounts + 3 more)
        const rankedProducts = rankProducts(storeProducts, searchQuery, 6);
        logger.info(`🎯 Ranked to ${rankedProducts.length} products (showing best matches with discounts)`);

        // Convert to ParsedProduct format (add card element)
        const products: ParsedProduct[] = rankedProducts.map(product => ({
            ...product.originalProduct,
            card: product.originalProduct.element || document.createElement('div') // Fallback if no element
        }));

        return products;

    } catch (error) {
        logger.error('Failed to parse search results', error);
        return [];
    }
}

async function executeSearch(item: ShoppingListItem): Promise<void> {
    logger.info(`Executing search for: "${item.name}"`);

    try {
        if (!currentStore) {
            throw new Error('No store detected - cannot perform search');
        }

        // Parse ingredient to extract just the name (without quantity)
        const parsed = parseIngredient(item.name);
        const searchTerm = parsed.name;

        logger.info(`🔍 Searching for ingredient name only: "${searchTerm}" (needed: ${parsed.neededAmount}${parsed.unit})`);

        // Use store-specific search method
        await currentStore.search(searchTerm);
        logger.info('✅ Search initiated via store method');

        // For SPA stores (like IKI), wait for products to load and notify background
        // that search is complete so it can proceed to scraping
        logger.info('⏳ Waiting for search results to load...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for results to load (avoid triggering anti-bot)

        // Notify background that search is complete and page is ready for scraping
        chrome.runtime.sendMessage({
            action: 'searchCompleted'
        });
        logger.info('✅ Notified background that search results are ready');

    } catch (error) {
        logger.error('Failed to execute search', error);
        throw error;
    }
}

window.addEventListener('shoppingListFromWebApp', (event: Event) => {
    const customEvent = event as CustomEvent;
    logger.info('Received shopping list from Web App', customEvent.detail);
    chrome.runtime.sendMessage({
        action: "startShoppingJob",
        items: customEvent.detail.items,
        store: customEvent.detail.store || 'barbora'
    });
});

window.addEventListener('priceCheckFromWebApp', (event: Event) => {
    const customEvent = event as CustomEvent;
    logger.info('Received price check request from Web App', customEvent.detail);
    chrome.runtime.sendMessage({
        action: "startPriceCheckJob",
        items: customEvent.detail.items,
        stores: customEvent.detail.stores || ['barbora']
    });
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

                case "executeScrape":
                    console.log('🧐 Executing scrape for:', message.item.name);
                    const parsedIngredient = parseIngredient(message.item.name);
                    const products = await parseSearchResults(parsedIngredient.name);
                    // Return only serializable data (remove DOM elements)
                    const serializableProducts: ScrapedProduct[] = products.map(({ card, ...rest }) => rest);
                    // Send message back to background script
                    chrome.runtime.sendMessage({
                        action: "scrapeCompleted",
                        products: serializableProducts
                    });
                    return { status: "Scrape completed." };

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

                case "priceCheckFinished":
                    logger.info('Price check finished, forwarding to Web App');
                    const event = new CustomEvent('priceCheckResultsToWebApp', {
                        detail: { results: message.results }
                    });
                    window.dispatchEvent(event);
                    return { status: "forwarded" };

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

logger.info('🏪 Detected store:', currentStore?.config.name || 'Unknown');
logger.info('Content script loaded and ready');

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {
    // Ignore errors if background script isn't listening
});

console.log('🚀 SHOPPING EXTENSION LOADED - Content script is active!');

// Alert on first load to confirm extension is working
if (window.location.href.includes('barbora.lt')) {
    console.log('✅ On Barbora.lt - Extension ready to work');
}

export { };
