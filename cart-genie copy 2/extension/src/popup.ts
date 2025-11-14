// src/popup.ts

type ManualTask = 'increase' | 'decrease' | 'remove';

/**
 * Sends a message to the background script to be forwarded to the content script.
 * @param task The specific manual task to perform.
 */
function sendManualTask(task: ManualTask): void {
    // This message goes to the background script.
    chrome.runtime.sendMessage({ action: "manualProcess", task: task }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(`Error sending manual task: ${chrome.runtime.lastError.message}`);
        } else {
            console.log(`Background script response: ${response?.status}`);
        }
    });
}

/**
 * Sends the search term to the background script to initiate the automated flow.
 * @param item The item to search for.
 */
function sendSearchAndAdd(item: string): void {
    // This message goes to the background script.
    chrome.runtime.sendMessage({ action: "searchAndAdd", item: item }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(`Error sending search task: ${chrome.runtime.lastError.message}`);
        } else {
            console.log(`Background script response: ${response?.status}`);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Automated Task Elements
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const searchAndAddBtn = document.getElementById('searchAndAddBtn');

    // Manual Control Elements
    const increaseBtn = document.getElementById('increase-btn');
    const decreaseBtn = document.getElementById('decrease-btn');
    const removeBtn = document.getElementById('remove-btn');

    // Listener for the new automated task
    searchAndAddBtn?.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            sendSearchAndAdd(searchTerm);
            window.close(); // Close popup after initiating the task
        } else {
            alert("Please enter an item to search for.");
        }
    });

    // Listeners for the manual controls
    increaseBtn?.addEventListener('click', () => sendManualTask('increase'));
    decreaseBtn?.addEventListener('click', () => sendManualTask('decrease'));
    removeBtn?.addEventListener('click', () => sendManualTask('remove'));
});
