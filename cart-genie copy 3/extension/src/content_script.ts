// src/content_script.ts

// ~~~~~~~~~~~~~~~ UTILITY & FINDER FUNCTIONS ~~~~~~~~~~~~~~~
const waitForElement = (selector: string, timeout: number = 10000): Promise<Element> => {
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

const findButtonByText = (parentElement: HTMLElement | ShadowRoot, buttonText: string): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
        const allButtons = parentElement.querySelectorAll('button');
        for (const button of allButtons) {
            if (button.textContent?.trim() === buttonText) {
                resolve(button);
                return;
            }
        }
        reject(new Error(`Could not find button with text "${buttonText}"`));
    });
};

const findButtonByAriaLabel = (parentElement: HTMLElement | ShadowRoot, ariaLabel: string): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
        const elementWithLabel = parentElement.querySelector(`[aria-label="${ariaLabel}"]`);
        if (elementWithLabel) {
            const clickableElement = elementWithLabel.closest('button, [role="button"]');
            if (clickableElement) {
                resolve(clickableElement as HTMLElement);
                return;
            }
        }
        reject(new Error(`Could not find a clickable element for aria-label "${ariaLabel}"`));
    });
};

const findProductCardAndShadowRoot = async (): Promise<ShadowRoot> => {
    const productCard = await waitForElement('li[data-testid^="product-card"]') as HTMLElement;
    const shadowHost = productCard.querySelector('div[id^="product-card-placeholder-"] > div');
    if (!shadowHost || !shadowHost.shadowRoot) {
        throw new Error("Could not find the Shadow DOM root for the product card.");
    }
    return shadowHost.shadowRoot;
};

// ~~~~~~~~~~~~~~~ CORE ACTION FUNCTIONS ~~~~~~~~~~~~~~~
const performAddToCart = async (): Promise<void> => {
    console.log("[CS] Attempting to perform AddToCart...");
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByText(shadowRoot, 'Į krepšelį');
    button.click();
    console.log("[CS] SUCCESS: Clicked 'Add to Cart'.");
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

// ~~~~~~~~~~~~~~~ MESSAGE LISTENER ~~~~~~~~~~~~~~~
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[CS] Content script received message:", message);
    (async () => {
        try {
            switch (message.action) {
                case "executeSearch":
                    await executeSearch(message.item);
                    sendResponse({ status: "Search executed." });
                    break;

                case "executeAddToCart":
                    await performAddToCart();
                    // After adding to cart, tell the background script the task is done
                    // so it can start the next one.
                    chrome.runtime.sendMessage({ action: "taskCompleted" });
                    sendResponse({ status: "Add to cart executed." });
                    break;

                case "jobFinished":
                    console.log("[CS] Received job finished signal.");
                    alert("Shopping list has been processed!");
                    break;
            }
        } catch (error) {
            console.error('[CS] Task failed.', error);
            // Optionally, notify the background script of the failure
            if (error instanceof Error) {
                chrome.runtime.sendMessage({ action: "taskFailed", error: error.message });
            }
        }
    })();
    return true; // Indicates an asynchronous response
});

console.log("[CS] Content script loaded and ready.");
