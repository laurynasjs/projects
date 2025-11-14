// src/content_script.ts

// ~~~~~~~~~~~~~~~ UTILITY FUNCTIONS ~~~~~~~~~~~~~~~

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

const findButtonByText = (
    parentElement: HTMLElement | ShadowRoot,
    buttonText: string
): Promise<HTMLElement> => {
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

const findButtonByAriaLabel = (
    parentElement: HTMLElement | ShadowRoot,
    ariaLabel: string
): Promise<HTMLElement> => {
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
}

// ~~~~~~~~~~~~~~~ CORE ACTION FUNCTIONS ~~~~~~~~~~~~~~~

const performAddToCart = async (): Promise<void> => {
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByText(shadowRoot, 'Į krepšelį');
    button.click();
    console.log(`[Shopping Helper] SUCCESS: Clicked "Add to Cart".`);
};

const performIncreaseQuantity = async (): Promise<void> => {
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByAriaLabel(shadowRoot, 'Didinti prekės kiekį');
    button.click();
    console.log(`[Shopping Helper] SUCCESS: Clicked "Increase Quantity".`);
};

// ADDED: Function to handle decreasing quantity
const performDecreaseQuantity = async (): Promise<void> => {
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByAriaLabel(shadowRoot, 'Mažinti prekės kiekį');
    button.click();
    console.log(`[Shopping Helper] SUCCESS: Clicked "Decrease Quantity".`);
};

const performRemoveFromCart = async (): Promise<void> => {
    const shadowRoot = await findProductCardAndShadowRoot();
    const button = await findButtonByAriaLabel(shadowRoot, 'Pašalinti iš krepšelio');
    button.click();
    console.log(`[Shopping Helper] SUCCESS: Clicked "Remove from Cart".`);
};


// ~~~~~~~~~~~~~~~ MESSAGE LISTENER ~~~~~~~~~~~~~~~

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "processItems") {
        console.log(`[Shopping Helper] Received task: ${message.task}`);
        try {
            switch (message.task) {
                case 'add':
                    await performAddToCart();
                    break;
                case 'increase':
                    await performIncreaseQuantity();
                    break;
                // ADDED: Case to handle the 'decrease' task
                case 'decrease':
                    await performDecreaseQuantity();
                    break;
                case 'remove':
                    await performRemoveFromCart();
                    break;
                default:
                    console.error(`[Shopping Helper] Unknown task: ${message.task}`);
                    break;
            }
            sendResponse({ status: "Task finished successfully." });
        } catch (error) {
            console.error(`[Shopping Helper] An error occurred:`, error);
            if (error instanceof Error) {
                sendResponse({ status: "Task failed.", error: error.message });
            } else {
                sendResponse({ status: "Task failed.", error: "An unknown error occurred." });
            }
        }
    }
    return true;
});