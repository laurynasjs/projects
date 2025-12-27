// src/popup.ts
import { ShoppingListItem } from './shared/types';
import { createLogger } from './shared/logger';

const logger = createLogger('POPUP');

type ManualTask = 'increase' | 'decrease' | 'remove';

function parseShoppingList(text: string): ShoppingListItem[] {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const items: ShoppingListItem[] = [];
    const lineRegex = /^\s*(.+?)\s*(?:[,\s]+(\d+))?\s*$/;

    for (const line of lines) {
        const match = line.match(lineRegex);
        if (match) {
            const potentialQuantity = match[2] ? parseInt(match[2], 10) : NaN;
            if (!isNaN(potentialQuantity)) {
                items.push({
                    name: match[1].trim(),
                    quantity: potentialQuantity,
                });
            } else {
                items.push({
                    name: line.trim(),
                    quantity: 1,
                });
            }
        }
    }

    return items;
}

function sendManualTask(task: ManualTask): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
            logger.error('Could not find an active tab');
            updateStatus('Error: No active tab found');
            return;
        }

        const activeTabId = tabs[0].id;
        if (!activeTabId) {
            logger.error('Active tab has no ID');
            return;
        }

        updateStatus(`Sending ${task} command...`);

        chrome.tabs.sendMessage(
            activeTabId,
            { action: 'manualTask', task: task },
            (response) => {
                if (chrome.runtime.lastError) {
                    logger.error(`Error: ${chrome.runtime.lastError.message}`);
                    updateStatus(`Error: ${chrome.runtime.lastError.message}`);
                } else {
                    logger.info(`Task ${task} completed: ${response?.status}`);
                    updateStatus(response?.status || 'Task completed');
                }
            }
        );
    });
}

function updateStatus(message: string): void {
    const statusContainer = document.getElementById('status-container');
    if (statusContainer) {
        statusContainer.textContent = message;
    }
}

function parseQuickSearchInput(input: string): { name: string; quantity: number } {
    // Parse format: "ingredient/quantity" (e.g., "pienas/2", "sūris cheddar/3")
    const parts = input.split('/');

    if (parts.length === 2) {
        const name = parts[0].trim();
        const quantity = parseInt(parts[1].trim(), 10);

        if (name && !isNaN(quantity) && quantity > 0) {
            return { name, quantity };
        }
    }

    // Default: treat entire input as name with quantity 1
    return { name: input.trim(), quantity: 1 };
}

function sendQuickSearch(item: string): void {
    const parsed = parseQuickSearchInput(item);
    updateStatus(`Searching for "${parsed.name}" (qty: ${parsed.quantity})...`);

    chrome.runtime.sendMessage({
        action: "startShoppingJob",
        items: [{ name: parsed.name, quantity: parsed.quantity }]
    }, (response) => {
        if (chrome.runtime.lastError) {
            logger.error('Error sending quick search', chrome.runtime.lastError);
            updateStatus('Error: Could not start search');
        } else {
            logger.info(`Quick search initiated: ${parsed.name} x${parsed.quantity}`);
            window.close();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Quick search
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const searchAndAddBtn = document.getElementById('searchAndAddBtn');

    searchAndAddBtn?.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            sendQuickSearch(searchTerm);
        } else {
            alert('Please enter an item to search for');
        }
    });

    // Bulk shopping list
    const shoppingListTextArea = document.getElementById('shoppingList') as HTMLTextAreaElement;
    const processListBtn = document.getElementById('processListBtn');

    if (!shoppingListTextArea || !processListBtn) {
        logger.error('Required DOM elements not found');
        return;
    }

    processListBtn.addEventListener('click', async () => {
        try {
            const listText = shoppingListTextArea.value.trim();

            if (!listText) {
                alert("Please enter at least one item.");
                return;
            }

            const items = parseShoppingList(listText);

            if (items.length === 0) {
                alert("Please enter at least one item in a valid format (e.g., 'Pienas' or 'Miltai 2').");
                return;
            }

            logger.info(`Starting shopping job with ${items.length} items`);

            const response = await chrome.runtime.sendMessage({
                action: "startShoppingJob",
                items: items
            });

            if (response.status === 'success') {
                logger.info('Job started successfully');
                window.close();
            } else {
                logger.error('Failed to start job', response);
                alert(`Failed to start shopping job: ${response.message || 'Unknown error'}`);
            }
        } catch (error) {
            logger.error('Error processing shopping list', error);
            alert('An error occurred. Please try again.');
        }
    });

    // Manual control buttons
    const increaseBtn = document.getElementById('increase-btn');
    const decreaseBtn = document.getElementById('decrease-btn');
    const removeBtn = document.getElementById('remove-btn');

    increaseBtn?.addEventListener('click', () => sendManualTask('increase'));
    decreaseBtn?.addEventListener('click', () => sendManualTask('decrease'));
    removeBtn?.addEventListener('click', () => sendManualTask('remove'));

    logger.info('Popup initialized with both modes');
});

export { };
