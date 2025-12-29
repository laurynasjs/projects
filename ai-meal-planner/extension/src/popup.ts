// src/popup.ts
import { ShoppingListItem } from './shared/types';
import { createLogger } from './shared/logger';
import { StoreName } from './stores';

const logger = createLogger('POPUP');
const STORE_PREFERENCE_KEY = 'selectedStore';

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
    const statusDiv = document.getElementById('status-container');
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}

async function getSelectedStore(): Promise<StoreName> {
    const result = await chrome.storage.local.get(STORE_PREFERENCE_KEY);
    return (result[STORE_PREFERENCE_KEY] as StoreName) || 'barbora';
}

async function saveSelectedStore(store: StoreName): Promise<void> {
    await chrome.storage.local.set({ [STORE_PREFERENCE_KEY]: store });
    logger.info(`Saved store preference: ${store}`);
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

async function sendQuickSearch(item: string): Promise<void> {
    const parsed = parseQuickSearchInput(item);
    const store = await getSelectedStore();
    updateStatus(`Searching for "${parsed.name}" (qty: ${parsed.quantity}) on ${store}...`);

    chrome.runtime.sendMessage({
        action: "startShoppingJob",
        items: [{ name: parsed.name, quantity: parsed.quantity }],
        store: store
    }, (response) => {
        if (chrome.runtime.lastError) {
            logger.error('Error sending quick search', chrome.runtime.lastError);
            updateStatus('Error: Could not start search');
        } else {
            logger.info(`Quick search initiated: ${parsed.name} x${parsed.quantity} on ${store}`);
            window.close();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Store selector
    const storeSelector = document.getElementById('storeSelector') as HTMLSelectElement;

    // Load saved store preference
    const savedStore = await getSelectedStore();
    storeSelector.value = savedStore;

    // Save store preference when changed
    storeSelector.addEventListener('change', async () => {
        const selectedStore = storeSelector.value as StoreName;
        await saveSelectedStore(selectedStore);
        updateStatus(`Store changed to ${selectedStore}`);
    });

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

            const store = await getSelectedStore();
            updateStatus(`Processing ${items.length} items on ${store}...`);

            chrome.runtime.sendMessage({
                action: "startShoppingJob",
                items,
                store: store
            }, (response) => {
                if (chrome.runtime.lastError) {
                    logger.error('Error sending bulk shopping list', chrome.runtime.lastError);
                    updateStatus('Error: Could not start shopping job');
                } else {
                    if (response.status === 'success') {
                        logger.info('Job started successfully');
                        window.close();
                    } else {
                        logger.error('Failed to start job', response);
                        alert(`Failed to start shopping job: ${response.message || 'Unknown error'}`);
                    }
                }
            });
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
