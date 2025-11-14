// src/popup.ts

// ADDED: 'decrease' to the list of possible tasks
type ShoppingTask = 'add' | 'increase' | 'decrease' | 'remove';

function sendTaskToContentScript(task: ShoppingTask): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
            console.error("Could not find an active tab.");
            return;
        }

        const activeTabId = tabs[0].id;
        if (!activeTabId) {
            console.error("Active tab has no ID.");
            return;
        }

        chrome.tabs.sendMessage(
            activeTabId,
            {
                action: "processItems",
                task: task,
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error(`Error: ${chrome.runtime.lastError.message}`);
                } else {
                    console.log(`Content script response: ${response?.status}`);
                }
            }
        );
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('add-btn');
    const increaseBtn = document.getElementById('increase-btn');
    // ADDED: Get the new decrease button
    const decreaseBtn = document.getElementById('decrease-btn');
    const removeBtn = document.getElementById('remove-btn');

    addBtn?.addEventListener('click', () => sendTaskToContentScript('add'));
    increaseBtn?.addEventListener('click', () => sendTaskToContentScript('increase'));
    // ADDED: Add listener for the new button
    decreaseBtn?.addEventListener('click', () => sendTaskToContentScript('decrease'));
    removeBtn?.addEventListener('click', () => sendTaskToContentScript('remove'));
});