// src/content_script.ts

// ~~~~~~~~~~~~~~~ UTILITY & FINDER FUNCTIONS ~~~~~~~~~~~~~~~
const waitForElement = (selector: string, timeout: number = 7000): Promise<Element> => {
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

// ~~~~~~~~~~~~~~~ NEW: SMARTER SELECTION & QUANTITY LOGIC ~~~~~~~~~~~~~~~

/**
 * Scrapes a single product card to find its unit price.
 * Returns the unit price as a number, or Infinity if not found.
 */
function getUnitPriceFromCard(card: Element): number {
    const shadowHost = card.querySelector('div[id^="product-card-placeholder-"] > div');
    if (shadowHost && shadowHost.shadowRoot) {
        // The unit price is usually in a div with a specific format, e.g., "2,3€/l"
        const unitPriceElement = shadowHost.shadowRoot.querySelector('div.text-2xs');
        if (unitPriceElement && unitPriceElement.textContent) {
            // "2,3€/l" -> "2,3" -> "2.3" -> 2.3
            const priceText = unitPriceElement.textContent.split('€')[0].replace(',', '.').trim();
            const price = parseFloat(priceText);
            return isNaN(price) ? Infinity : price;
        }
    }
    return Infinity; // Return a high number if price can't be found
}

/**
 * Finds the "Add to Cart" button within a specific product card.
 */
async function findButtonInCard(card: Element): Promise<HTMLElement | null> {
    const shadowHost = card.querySelector('div[id^="product-card-placeholder-"] > div');
    if (shadowHost && shadowHost.shadowRoot) {
        const buttons = shadowHost.shadowRoot.querySelectorAll('button');
        for (const button of buttons) {
            if (button.textContent?.trim() === 'Į krepšelį') {
                return button as HTMLElement;
            }
        }
    }
    return null;
}

/**
 * Clicks the "+" button inside a card a specified number of times.
 */
async function increaseQuantity(card: Element, times: number): Promise<void> {
    const shadowHost = card.querySelector('div[id^="product-card-placeholder-"] > div');
    if (shadowHost && shadowHost.shadowRoot) {
        const increaseButton = shadowHost.shadowRoot.querySelector('[aria-label="Didinti prekės kiekį"]');
        if (increaseButton) {
            for (let i = 0; i < times; i++) {
                (increaseButton as HTMLElement).click();
                // Wait a short moment for the UI to update between clicks
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
    }
}

// ~~~~~~~~~~~~~~~ CORE ACTION FUNCTIONS (REWRITTEN) ~~~~~~~~~~~~~~~
const performAddToCart = async (item: { name: string, quantity: number }): Promise<void> => {
    console.log(`[CS] Finding best value for "${item.name}"...`);
    try {
        // Wait for at least one card to appear to ensure the list is loaded.
        await waitForElement('li[data-testid^="product-card"]');

        const allCards = document.querySelectorAll('li[data-testid^="product-card"]');
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
            const button = await findButtonInCard(bestCard);
            if (button) {
                button.click();
                // Wait for the "+" button to appear after adding to cart
                await new Promise(resolve => setTimeout(resolve, 1000));
                // We need to click quantity-1 times (since the first click adds 1)
                if (item.quantity > 1) {
                    await increaseQuantity(bestCard, item.quantity - 1);
                }
                chrome.runtime.sendMessage({ action: "taskCompleted", status: "success" });
            } else {
                throw new Error("Found best card, but couldn't find its 'Add to Cart' button.");
            }
        } else {
            throw new Error("Could not find any product cards to evaluate.");
        }
    } catch (error) {
        console.error("[CS] FAILED: Could not add product to cart.", error);
        chrome.runtime.sendMessage({ action: "taskCompleted", status: "notFound" });
    }
};

const executeSearch = async (item: { name: string, quantity: number }): Promise<void> => {
    // This function now only needs the name for searching
    console.log(`[CS] Executing search for: "${item.name}"`);
    const searchInput = await waitForElement('#fti-search') as HTMLInputElement;
    searchInput.value = item.name;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));
    const searchButton = document.querySelector('#fti-initiate-search') as HTMLElement;
    if (!searchButton) throw new Error("Could not find search button.");
    searchButton.click();
    console.log("[CS] SUCCESS: Clicked search button.");
};

// ~~~~~~~~~~~~~~~ MESSAGE LISTENER (UPDATED) ~~~~~~~~~~~~~~~
let dutyInterval: NodeJS.Timeout | null = null;

function reportForDuty() {
    console.log("[CS] Content script loaded. Reporting for duty.");
    chrome.runtime.sendMessage({ action: "contentScriptReady" });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (dutyInterval) {
        clearInterval(dutyInterval);
        dutyInterval = null;
    }
    (async () => {
        switch (message.action) {
            case "executeSearch":
                await executeSearch(message.item);
                sendResponse({ status: "Search executed." });
                break;
            case "executeAddToCart":
                // The 'item' object with quantity is now passed here
                await performAddToCart(message.item);
                sendResponse({ status: "Add to cart initiated." });
                break;
            case "jobFinished":
                alert("Shopping list has been processed!");
                break;
        }
    })();
    return true;
});

let attempts = 0;
dutyInterval = setInterval(() => {
    attempts++;
    if (attempts > 5) {
        if (dutyInterval) {
            clearInterval(dutyInterval);
        }
        return;
    }
    reportForDuty();
}, 300);
