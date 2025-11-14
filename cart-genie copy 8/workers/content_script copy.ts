// src/content_script.ts

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const findButtonByTextInParent = (parentElement: HTMLElement, buttonText: string, timeout: number = 5000): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
        const intervalTime = 500;
        let timeWaited = 0;
        const interval = setInterval(() => {
            const allButtons = parentElement.querySelectorAll('button');
            for (const button of allButtons) {
                if (button.textContent?.includes(buttonText)) {
                    clearInterval(interval);
                    resolve(button);
                    return;
                }
            }
            timeWaited += intervalTime;
            if (timeWaited >= timeout) {
                clearInterval(interval);
                reject(new Error(`Could not find button with text "${buttonText}"`));
            }
        }, intervalTime);
    });
};

const processItem = async (item: string): Promise<void> => {
    // This debugger statement will pause the script right at the beginning
    // of the process, allowing you to step through the code.
    debugger;

    try {
        console.log(`[Shopping Helper] Starting to process: ${item}`);
        const searchInput = document.querySelector('#fti-search') as HTMLInputElement;
        if (!searchInput) {
            console.error(`[Shopping Helper] Could not find search input.`);
            return;
        }
        searchInput.value = item;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(500);

        const searchButton = document.querySelector('#fti-initiate-search') as HTMLElement;
        if (!searchButton) {
            console.error(`[Shopping Helper] Could not find search button.`);
            return;
        }
        searchButton.click();

        // The page reloads after the click, so the code below will not run yet.
        // We will solve this page reload issue AFTER we get the "add to cart"
        // logic working on the search results page manually.
        console.log(`[Shopping Helper] Search initiated. The script will stop here due to page reload.`);

    } catch (error) {
        console.error(`[Shopping Helper] An error occurred:`, error);
    }
};

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "processItems") {
        const items: string[] = message.items;
        console.log("[Shopping Helper] Received items:", items);

        // This version will only process the first item for now
        if (items.length > 0) {
            await processItem(items[0]);
        }

        console.log('Shopping Helper has finished processing the list!');
        sendResponse({ status: "All items processed" });
    }
    return true;
});
