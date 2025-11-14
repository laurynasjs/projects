// src/background.ts
import { storeProfiles, StoreProfile } from './store-profiles'; // Import the profiles

const JOB_STORAGE_KEY = 'shoppingJob';

type ShoppingListItem = {
    name: string;
    quantity: number;
};

// The job now includes the key for the target store profile
type ShoppingJob = {
    items: ShoppingListItem[];
    failedItems: string[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
    status: 'searching' | 'addingToCart' | 'idle';
    targetStore: string; // e.g., 'barbora' or 'lastmile'
    targetTabId?: number;
};

async function updateJob(job: ShoppingJob | null) {
    // Helper function to save the current state of the job
    await chrome.storage.session.set({ [JOB_STORAGE_KEY]: job });
}

async function startNextSearch(job: ShoppingJob, tabId: number) {
    // This function initiates the search for the next item in the list.
    if (job.currentIndex >= job.items.length) {
        // All items have been processed, finish the job.
        job.statusMessage = `Job finished! Success: ${job.items.length - job.failedItems.length}, Failed: ${job.failedItems.length}.`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);
        // Notify the content script to alert the user
        chrome.tabs.sendMessage(tabId, { action: "jobFinished" });
        return;
    }

    const currentItem = job.items[job.currentIndex];
    const profile = storeProfiles[job.targetStore];
    if (!profile) {
        console.error(`[BG] Critical error: Profile for ${job.targetStore} not found during search.`);
        return;
    }

    job.statusMessage = `Searching for "${currentItem.name}" (${job.currentIndex + 1}/${job.items.length})`;
    job.status = 'searching';
    await updateJob(job);

    // Send the search command to the content script, including the store's profile
    chrome.tabs.sendMessage(tabId, {
        action: "executeSearch",
        item: currentItem,
        profile: profile // Pass the specific store profile
    });
}

// Main listener for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (message.action === "startShoppingJob") {
            console.log(`[BG] Received startShoppingJob for store: ${message.targetStore}`);
            try {
                const profile = storeProfiles[message.targetStore];
                if (!profile) {
                    throw new Error(`No profile found for store: ${message.targetStore}`);
                }

                // Open the correct URL based on the selected store profile
                const newTab = await chrome.tabs.create({ url: profile.url, active: true });

                if (!newTab.id) {
                    throw new Error("Failed to create a new tab for the job.");
                }

                const newJob: ShoppingJob = {
                    items: message.items,
                    failedItems: [],
                    currentIndex: 0,
                    statusMessage: `Navigating to ${profile.name}...`,
                    isRunning: true,
                    status: 'idle',
                    targetStore: message.targetStore, // Store the key, e.g., 'barbora'
                    targetTabId: newTab.id,
                };
                await updateJob(newJob);
                sendResponse({ status: "Job initiated." });

            } catch (error) {
                console.error("[BG] Error starting shopping job:", error);
                sendResponse({ status: "Failed to start job." });
            }

        } else if (message.action === "taskCompleted") {
            const { [JOB_STORAGE_KEY]: currentJob } = await chrome.storage.session.get(JOB_STORAGE_KEY);
            if (currentJob?.isRunning && currentJob.targetTabId) {
                if (message.status === 'notFound') {
                    // Log failed items
                    currentJob.failedItems.push(currentJob.items[currentJob.currentIndex].name);
                }
                currentJob.currentIndex++;
                // Proceed to the next item
                await startNextSearch(currentJob, currentJob.targetTabId);
            }
        }
    })();
    return true; // Indicates an asynchronous response
});

// Listener for when a tab is updated (e.g., a page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We only care about when the page is fully loaded
    if (changeInfo.status !== 'complete') {
        return;
    }

    const { [JOB_STORAGE_KEY]: job } = await chrome.storage.session.get(JOB_STORAGE_KEY);
    if (!job?.isRunning || job.targetTabId !== tabId) {
        // Ignore updates from tabs that are not part of our active job
        return;
    }

    const profile = storeProfiles[job.targetStore];
    if (!profile || !tab.url?.startsWith(profile.url)) {
        // Ignore updates if the URL doesn't match our target store's URL
        return;
    }

    // --- State Machine Logic ---
    if (job.status === 'idle') {
        // This is the first load after creating the tab. Time to start the first search.
        console.log(`[BG] Target tab ${tabId} for ${profile.name} loaded. Starting first search.`);
        await startNextSearch(job, tabId);

    } else if (job.status === 'searching') {
        // The page has reloaded after a search was executed. Now, add the item to the cart.
        console.log(`[BG] Target tab ${tabId} reloaded after search. Adding to cart.`);
        job.status = 'addingToCart';
        const currentItem = job.items[job.currentIndex];
        job.statusMessage = `Page loaded. Adding "${currentItem.name}" to cart...`;
        await updateJob(job);

        // Send the command to the content script, including the store's profile
        chrome.tabs.sendMessage(tabId, {
            action: 'executeAddToCart',
            item: currentItem,
            profile: profile // Pass the specific store profile
        });
    }
});

export { };
