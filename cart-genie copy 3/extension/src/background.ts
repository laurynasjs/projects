// src/background.ts

// --- State Management ---
const JOB_STORAGE_KEY = 'shoppingJob';

type ShoppingJob = {
    items: string[];
    currentIndex: number;
    status: 'searching' | 'addingToCart';
};

// --- Helper Functions ---
async function startNextSearch(job: ShoppingJob, tabId: number) {
    // Check if the job is done
    if (job.currentIndex >= job.items.length) {
        console.log('[BG] Shopping job completed.');
        await chrome.storage.session.remove(JOB_STORAGE_KEY); // Clean up storage
        chrome.tabs.sendMessage(tabId, { action: "jobFinished" }); // Optional: notify the page
        return;
    }

    const currentItem = job.items[job.currentIndex];
    job.status = 'searching';
    await chrome.storage.session.set({ [JOB_STORAGE_KEY]: job });

    console.log(`[BG] Starting search for item ${job.currentIndex + 1}/${job.items.length}: "${currentItem}"`);
    chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem });
}

// --- Event Listeners ---

// Listens for the initial "start" command from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startShoppingJob") {
        (async () => {
            const job: ShoppingJob = {
                items: message.items,
                currentIndex: 0,
                status: 'searching'
            };
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await startNextSearch(job, tab.id);
                sendResponse({ status: "Shopping job started." });
            } else {
                sendResponse({ status: "Error: No active tab found." });
            }
        })();
        return true; // Indicates an asynchronous response
    }

    // Listens for the "I'm done" message from the content script
    if (message.action === "taskCompleted") {
        (async () => {
            const { [JOB_STORAGE_KEY]: job } = await chrome.storage.session.get(JOB_STORAGE_KEY);
            if (job) {
                job.currentIndex++; // Move to the next item
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    await startNextSearch(job, tab.id);
                }
            }
        })();
    }
});

// Listens for when a tab is updated (e.g., after a search)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Ensure the page is fully loaded and on the correct website
    if (changeInfo.status === 'complete' && tab.url?.includes('barbora.lt')) {
        const { [JOB_STORAGE_KEY]: job } = await chrome.storage.session.get(JOB_STORAGE_KEY);

        // If a search was just completed, the next step is to add the item to the cart.
        if (job && job.status === 'searching') {
            job.status = 'addingToCart';
            await chrome.storage.session.set({ [JOB_STORAGE_KEY]: job });

            console.log(`[BG] Page loaded. Telling content script to add item to cart.`);
            chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart' });
        }
    }
});
