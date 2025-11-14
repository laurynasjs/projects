// src/popup.ts

document.addEventListener('DOMContentLoaded', () => {
    const shoppingListTextArea = document.getElementById('shoppingList') as HTMLTextAreaElement;
    const processListBtn = document.getElementById('processListBtn');

    processListBtn?.addEventListener('click', () => {
        const listText = shoppingListTextArea.value;
        // Split by new line and filter out any empty lines
        const items = listText.split('\n').filter(item => item.trim() !== '');

        if (items.length > 0) {
            // Send a message to the background script to start the shopping job
            chrome.runtime.sendMessage({ action: "startShoppingJob", items: items }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                } else {
                    console.log(response?.status);
                    window.close(); // Close the popup after starting the job
                }
            });
        } else {
            alert("Please enter at least one item in the shopping list.");
        }
    });
});
