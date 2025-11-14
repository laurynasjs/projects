// src/background.ts

const JOB_STORAGE_KEY = 'shoppingJob';

type ShoppingListItem = {
    name: string;
    quantity: number;
};

type ShoppingJob = {
    items: ShoppingListItem[];
    failedItems: string[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
    status: 'searching' | 'addingToCart' | 'idle';
    targetTabId?: number; // --- NEW: To track the specific tab for the job ---
};

async function updateJob(job: ShoppingJob | null) {
    await chrome.storage.session.set({ [JOB_STORAGE_KEY]: job });
}

async function startNextSearch(job: ShoppingJob, tabId: number) {
    if (job.currentIndex >= job.items.length) {
        job.statusMessage = `Job finished! Success: ${job.items.length - job.failedItems.length}, Failed: ${job.failedItems.length}.`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);
        chrome.tabs.sendMessage(tabId, { action: "jobFinished" });
        return;
    }

    const currentItem = job.items[job.currentIndex];
    job.statusMessage = `Searching for "${currentItem.name}" (${job.currentIndex + 1}/${job.items.length})`;
    job.status = 'searching';
    await updateJob(job);
    chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (message.action === "startShoppingJob") {
            console.log("[BG] Received startShoppingJob message.");
            try {
                // Create a new tab for the shopping website first.
                const barboraTab = await chrome.tabs.create({ url: "https://www.barbora.lt/", active: true });

                if (!barboraTab.id) {
                    throw new Error("Failed to create a new tab for the job.");
                }

                const newJob: ShoppingJob = {
                    items: message.items,
                    failedItems: [],
                    currentIndex: 0,
                    statusMessage: "Navigating to Barbora...",
                    isRunning: true,
                    status: 'idle',
                    targetTabId: barboraTab.id, // --- Store the ID of our target tab ---
                };
                await updateJob(newJob);
                sendResponse({ status: "Job initiated, opening new tab." });
            } catch (error) {
                console.error("[BG] Error starting shopping job:", error);
                sendResponse({ status: "Failed to start job." });
            }

        } else if (message.action === "taskCompleted") {
            const { [JOB_STORAGE_KEY]: currentJob } = await chrome.storage.session.get(JOB_STORAGE_KEY);
            if (currentJob && currentJob.targetTabId) {
                if (message.status === 'notFound') {
                    currentJob.failedItems.push(currentJob.items[currentJob.currentIndex].name);
                }
                currentJob.currentIndex++;
                await startNextSearch(currentJob, currentJob.targetTabId);
            }
        }
    })();
    return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only proceed if the page is fully loaded.
    if (changeInfo.status !== 'complete' || !tab.url?.includes('barbora.lt')) {
        return;
    }

    const { [JOB_STORAGE_KEY]: job } = await chrome.storage.session.get(JOB_STORAGE_KEY);

    // --- CORRECTED LOGIC: Only act on the specific tab we are tracking for the job ---
    if (job?.isRunning && job.targetTabId === tabId) {
        if (job.status === 'idle') {
            // This is the first search after the new tab has loaded.
            console.log(`[BG] Target tab ${tabId} loaded. Starting first search.`);
            await startNextSearch(job, tabId);
        } else if (job.status === 'searching') {
            // This handles subsequent searches in the list.
            console.log(`[BG] Target tab ${tabId} reloaded after search. Adding to cart.`);
            job.status = 'addingToCart';
            const currentItem = job.items[job.currentIndex];
            job.statusMessage = `Page loaded. Adding "${currentItem.name}" to cart...`;
            await updateJob(job);
            chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart', item: currentItem });
        }
    }
});

export { };
