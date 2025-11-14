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
    // This function must return the shadowRoot to fulfill its Promise<ShadowRoot> signature.
    return shadowHost.shadowRoot;
};


// ~~~~~~~~~~~~~~~ CORE ACTION FUNCTIONS ~~~~~~~~~~~~~~~
const performAddToCart = async (): Promise<void> => {
    console.log("[Shopping Helper] Attempting to perform AddToCart...");
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByText(shadowRoot, 'Į krepšelį');
    button.click();
    console.log("[Shopping Helper] SUCCESS: Clicked 'Add to Cart'.");
};

const performIncreaseQuantity = async (): Promise<void> => {
    console.log("[Shopping Helper] Attempting to perform IncreaseQuantity...");
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByAriaLabel(shadowRoot, 'Didinti prekės kiekį');
    button.click();
    console.log("[Shopping Helper] SUCCESS: Clicked 'Increase Quantity'.");
};

const performDecreaseQuantity = async (): Promise<void> => {
    console.log("[Shopping Helper] Attempting to perform DecreaseQuantity...");
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByAriaLabel(shadowRoot, 'Mažinti prekės kiekį');
    button.click();
    console.log("[Shopping Helper] SUCCESS: Clicked 'Decrease Quantity'.");
};

const performRemoveFromCart = async (): Promise<void> => {
    console.log("[Shopping Helper] Attempting to perform RemoveFromCart...");
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByAriaLabel(shadowRoot, 'Pašalinti iš krepšelio');
    button.click();
    console.log("[Shopping Helper] SUCCESS: Clicked 'Remove from Cart'.");
};


// ~~~~~~~~~~~~~~~ SEARCH FUNCTION ~~~~~~~~~~~~~~~
const executeSearch = async (item: string): Promise<void> => {
    console.log(`[Shopping Helper] Attempting to execute search for: "${item}"`);
    const searchInput = await waitForElement('#fti-search') as HTMLInputElement;
    searchInput.value = item;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));
    const searchButton = document.querySelector('#fti-initiate-search') as HTMLElement;
    if (!searchButton) throw new Error("Could not find search button.");
    searchButton.click();
    console.log("[Shopping Helper] SUCCESS: Clicked search button.");
};


// ~~~~~~~~~~~~~~~ MESSAGE LISTENER ~~~~~~~~~~~~~~~
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[Shopping Helper] Content script received message:", message); // Log all incoming messages
    (async () => {
        try {
            switch (message.action) {
                case "executeSearch":
                    await executeSearch(message.item);
                    sendResponse({ status: "Search executed." });
                    break;

                case "executeAddToCart":
                    await performAddToCart();
                    sendResponse({ status: "Add to cart executed." });
                    break;

                case "manualProcess":
                    switch (message.task) {
                        case 'increase': await performIncreaseQuantity(); break;
                        case 'decrease': await performDecreaseQuantity(); break;
                        case 'remove': await performRemoveFromCart(); break;
                        default:
                            console.error(`[Shopping Helper] Unknown manual task: ${message.task}`);
                            break;
                    }
                    sendResponse({ status: "Manual task finished." });
                    break;

                default:
                    console.warn(`[Shopping Helper] Unknown action received: ${message.action}`);
                    sendResponse({ status: "Unknown action." });
                    break;
            }
        } catch (error) {
            console.error('[Shopping Helper] Task failed in content script.', error);
            if (error instanceof Error) {
                sendResponse({ status: "Task failed", error: error.message });
            } else {
                sendResponse({ status: "Task failed", error: "Unknown error" });
            }
        }
    })();
    return true; // Indicates an asynchronous response
});

console.log("[Shopping Helper] Content script loaded.");
