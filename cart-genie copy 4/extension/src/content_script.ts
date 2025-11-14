// src/content_script.ts

// ~~~~~~~~~~~~~~~ UTILITY & FINDER FUNCTIONS ~~~~~~~~~~~~~~~

const findAddToCartButton = (timeout: number = 10000): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
        const intervalTime = 200; // Poll slightly less frequently
        let timeWaited = 0;
        let cardWasFound = false;

        const interval = setInterval(() => {
            timeWaited += intervalTime;
            if (timeWaited >= timeout) {
                clearInterval(interval);
                const errorMessage = cardWasFound
                    ? "Found product card, but timed out waiting for the 'Add to Cart' button inside it."
                    : "Timed out waiting for product card to appear.";
                reject(new Error(errorMessage));
                return;
            }

            const productCard = document.querySelector('li[data-testid^="product-card"]');
            if (!productCard) {
                return; // If no card yet, just wait for the next interval.
            }
            cardWasFound = true;

            const shadowHost = productCard.querySelector('div[id^="product-card-placeholder-"] > div');
            if (shadowHost && shadowHost.shadowRoot) {
                const allButtons = shadowHost.shadowRoot.querySelectorAll('button');
                for (const button of allButtons) {
                    if (button.textContent?.trim() === 'Į krepšelį') {
                        clearInterval(interval);
                        resolve(button);
                        return;
                    }
                }
            }
        }, intervalTime);
    });
};

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


// ~~~~~~~~~~~~~~~ CORE ACTION FUNCTIONS ~~~~~~~~~~~~~~~
const performAddToCart = async (): Promise<void> => {
    console.log("[CS] Waiting for either a product or a 'not found' message...");

    // Create two promises that will race against each other.
    const findButtonPromise = findAddToCartButton();
    const findWarningPromise = waitForElement('.b-alert--warning');

    try {
        // Wait for the first promise to resolve.
        const winner = await Promise.race([findButtonPromise, findWarningPromise]);

        // Check the tag name to see which promise won.
        if (winner.tagName === 'BUTTON') {
            const button = winner as HTMLElement;
            button.click();
            console.log("[CS] SUCCESS: Found product and clicked 'Add to Cart'.");
            chrome.runtime.sendMessage({ action: "taskCompleted", status: "success" });
        } else {
            // The warning div appeared.
            console.log("[CS] INFO: 'Item not found' message appeared on page. Skipping.");
            chrome.runtime.sendMessage({ action: "taskCompleted", status: "notFound" });
        }
    } catch (error) {
        // This will catch if BOTH promises time out and reject.
        console.log("[CS] INFO: Timed out waiting for both product and 'not found' message.", error);
        chrome.runtime.sendMessage({ action: "taskCompleted", status: "notFound" });
    }
};

const executeSearch = async (item: string): Promise<void> => {
    console.log(`[CS] Attempting to execute search for: "${item}"`);
    const searchInput = await waitForElement('#fti-search') as HTMLInputElement;

    searchInput.value = item;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));

    const searchButton = document.querySelector('#fti-initiate-search') as HTMLElement;
    if (!searchButton) throw new Error("Could not find search button.");
    searchButton.click();
    console.log("[CS] SUCCESS: Clicked search button.");
};

// ~~~~~~~~~~~~~~~ SCRIPT INITIALIZATION & SINGLE MESSAGE LISTENER ~~~~~~~~~~~~~~~

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

    console.log("[CS] Content script received message:", message);
    (async () => {
        switch (message.action) {
            case "executeSearch":
                await executeSearch(message.item);
                sendResponse({ status: "Search executed." });
                break;
            case "executeAddToCart":
                await performAddToCart();
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
