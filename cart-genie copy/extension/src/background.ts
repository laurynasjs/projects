// src/background.ts

// This listener waits for a message from the popup script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fillCart") {
        const itemsToProcess: string[] = message.items;
        console.log("Background script received items:", itemsToProcess);

        // Get the currently active tab to inject the content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.id) {
                // First, inject the content script into the active tab
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content_script.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error injecting script:", chrome.runtime.lastError.message);
                        sendResponse({ status: "Error injecting script" });
                        return;
                    }
                    // After the script is successfully injected, send the shopping list to it.
                    chrome.tabs.sendMessage(activeTab.id!, {
                        action: "processItems",
                        items: itemsToProcess
                    });
                });
            } else {
                console.error("Could not find active tab.");
                sendResponse({ status: "Could not find active tab" });
            }
        });

        sendResponse({ status: "Processing started" });
    }
    return true; // Keep the message channel open for an asynchronous response
});
