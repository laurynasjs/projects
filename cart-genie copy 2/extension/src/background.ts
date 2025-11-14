// src/background.ts

// Listens for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handles the automated search and add flow
    if (message.action === "searchAndAdd") {
        (async () => {
            // 1. Set the pending task in session storage.
            await chrome.storage.session.set({ pendingTask: 'addToCartAfterSearch' });

            // 2. Forward the command to the content script to perform the search.
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, { action: "executeSearch", item: message.item });
            }
            sendResponse({ status: "Search initiated by background." });
        })();
        return true; // Indicates an asynchronous response.
    }

    // Forwards manual control messages directly to the content script.
    if (message.action === "manualProcess") {
        (async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, message); // Forward the original message
            }
            sendResponse({ status: "Manual task forwarded by background." });
        })();
        return true;
    }
});

// Listens for tab updates (e.g., after a page reloads from a search)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We only care about when the page has finished loading.
    if (changeInfo.status === 'complete' && tab.url?.includes('barbora.lt')) {

        // Check storage to see if we have a task waiting for this page load.
        const { pendingTask } = await chrome.storage.session.get('pendingTask');

        if (pendingTask === 'addToCartAfterSearch') {
            // Clear the task immediately to prevent it from running again on a refresh.
            await chrome.storage.session.remove('pendingTask');

            // Send the command to the content script to perform the final action.
            chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart' });
        }
    }
});
