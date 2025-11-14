// src/content_script.ts
import { StoreProfile } from './store-profiles';

// ===================================================================
// GENERIC HELPER FUNCTIONS
// ===================================================================

const waitForElement = (selector: string, timeout: number = 7000): Promise<Element> => {
    // This is a generic helper that waits for an element to appear in the DOM.
    // It's store-agnostic and can be used by any store-specific logic.
    return new Promise((resolve, reject) => {
        const intervalTime = 100;
        let timeWaited = 0;
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else {
                timeWaited += intervalTime;
                if (timeWaited >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`Timed out waiting for: ${selector}`));
                }
            }
        }, intervalTime);
    });
};

const executeSearch = async (item: { name: string }, profile: StoreProfile): Promise<void> => {
    // This function is now generic. It uses selectors from the passed-in profile.
    console.log(`[CS] Executing search for: "${item.name}" on ${profile.name}`);
    try {
        const searchInput = await waitForElement(profile.searchInputSelector) as HTMLInputElement;
        searchInput.value = item.name;
        // Dispatch an 'input' event to make sure any frontend frameworks react to the change.
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        // A small delay can help prevent issues with rapid automated inputs.
        const randomDelay = 250 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        const searchButton = document.querySelector(profile.searchButtonSelector) as HTMLElement;
        if (!searchButton) throw new Error(`Could not find search button with selector: "${profile.searchButtonSelector}"`);

        searchButton.click();
        console.log(`[CS] SUCCESS: Clicked search button for ${profile.name}.`);
    } catch (error) {
        console.error(`[CS] FAILED: Could not execute search on ${profile.name}.`, error);
        // Notify background script of failure to proceed to the next item.
        chrome.runtime.sendMessage({ action: "taskCompleted", status: "notFound" });
    }
};


// ===================================================================
// STORE-SPECIFIC LOGIC
// Each store has a different website structure, especially for product cards.
// We create separate functions to handle the "add to cart" logic for each store.
// ===================================================================

// --- Barbora Specific Functions ---
namespace Barbora {
    function getUnitPriceFromCard(card: Element): number {
        const shadowHost = card.querySelector('div[id^="product-card-placeholder-"] > div');
        if (shadowHost?.shadowRoot) {
            const unitPriceElement = shadowHost.shadowRoot.querySelector('div.text-2xs');
            if (unitPriceElement?.textContent) {
                const priceText = unitPriceElement.textContent.split('€')[0].replace(',', '.').trim();
                const price = parseFloat(priceText);
                return isNaN(price) ? Infinity : price;
            }
        }
        return Infinity;
    }

    async function findButtonInCard(card: Element, buttonText: string): Promise<HTMLElement | null> {
        const shadowHost = card.querySelector('div[id^="product-card-placeholder-"] > div');
        if (shadowHost?.shadowRoot) {
            const buttons = shadowHost.shadowRoot.querySelectorAll('button');
            for (const button of buttons) {
                if (button.textContent?.trim() === buttonText) {
                    return button;
                }
            }
        }
        return null;
    }

    async function increaseQuantity(card: Element, times: number, ariaLabel: string): Promise<void> {
        const shadowHost = card.querySelector('div[id^="product-card-placeholder-"] > div');
        if (shadowHost?.shadowRoot) {
            const increaseButton = shadowHost.shadowRoot.querySelector(`[aria-label="${ariaLabel}"]`);
            if (!increaseButton) return;

            for (let i = 0; i < times; i++) {
                (increaseButton as HTMLElement).click();
                await new Promise(resolve => setTimeout(resolve, 250)); // Wait for UI to update
            }
        }
    }

    export async function performAddToCart(item: { name: string, quantity: number }, profile: StoreProfile): Promise<void> {
        console.log(`[CS] Finding best value for "${item.name}" on Barbora...`);
        await waitForElement(profile.productCardSelector);

        const allCards = document.querySelectorAll(profile.productCardSelector);
        let bestCard: Element | null = null;
        let lowestPrice = Infinity;

        for (const card of allCards) {
            const unitPrice = getUnitPriceFromCard(card);
            if (unitPrice < lowestPrice) {
                lowestPrice = unitPrice;
                bestCard = card;
            }
        }

        if (bestCard) {
            console.log(`[CS] Best value found with unit price: ${lowestPrice}. Adding to cart...`);
            const button = await findButtonInCard(bestCard, profile.addToCartButtonSelector);
            if (button) {
                button.click();
                if (item.quantity > 1) {
                    await increaseQuantity(bestCard, item.quantity - 1, profile.increaseQuantityButtonAriaLabel);
                }
                chrome.runtime.sendMessage({ action: "taskCompleted", status: "success" });
            } else {
                throw new Error("Found best card, but couldn't find its 'Add to Cart' button.");
            }
        } else {
            throw new Error("Could not find any product cards to evaluate.");
        }
    }
}

// --- Last Mile Specific Functions (Placeholder) ---
namespace LastMile {
    // NOTE: This is a placeholder. You would need to inspect lastmile.lt
    // and write the logic to find the price and buttons, similar to the Barbora functions.
    export async function performAddToCart(item: { name: string, quantity: number }, profile: StoreProfile): Promise<void> {
        console.log(`[CS] Finding best value for "${item.name}" on Last Mile...`);
        await waitForElement(profile.productCardSelector);
        const allCards = document.querySelectorAll(profile.productCardSelector);

        if (allCards.length > 0) {
            const firstCard = allCards[0]; // Simplistic approach for the example
            const button = firstCard.querySelector(profile.addToCartButtonSelector) as HTMLElement;
            if (button) {
                button.click();
                // You would add quantity logic here if needed.
                chrome.runtime.sendMessage({ action: "taskCompleted", status: "success" });
            } else {
                throw new Error(`Could not find "Add to Cart" button with selector: ${profile.addToCartButtonSelector}`);
            }
        } else {
            throw new Error("Could not find any product cards to evaluate.");
        }
    }
}


// ===================================================================
// MAIN MESSAGE LISTENER
// This is the entry point for commands from the background script.
// ===================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        // The message from the background script now includes the store profile
        const { action, item, profile } = message;
        if (!profile) {
            console.error("[CS] Received a command without a store profile. Aborting.");
            return;
        }

        try {
            switch (action) {
                case "executeSearch":
                    await executeSearch(item, profile);
                    break;

                case "executeAddToCart":
                    // This "dispatcher" calls the correct function based on the store name
                    switch (profile.name) {
                        case 'Barbora':
                            await Barbora.performAddToCart(item, profile);
                            break;
                        case 'Last Mile':
                            await LastMile.performAddToCart(item, profile);
                            break;
                        default:
                            throw new Error(`No "add to cart" logic defined for store: ${profile.name}`);
                    }
                    break;

                case "jobFinished":
                    alert("Shopping list has been processed!");
                    break;
            }
            sendResponse({ status: "Action completed successfully." });
        } catch (error) {
            console.error("[CS] FAILED: An error occurred processing the action.", action, error);
            // Notify the background script that this item failed so it can move to the next one.
            chrome.runtime.sendMessage({ action: "taskCompleted", status: "notFound" });
            sendResponse({ status: "Action failed." });
        }
    })();
    return true; // Indicates an asynchronous response
});

export { };
