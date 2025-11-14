// src/popup.ts

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
};

function updateUI(job: ShoppingJob | null) {
    const jobForm = document.getElementById('job-form');
    const statusContainer = document.getElementById('status-container');
    const processListBtn = document.getElementById('processListBtn') as HTMLButtonElement;

    if (!jobForm || !statusContainer || !processListBtn) { return; }

    if (job?.isRunning) {
        jobForm.style.display = 'none';
        statusContainer.textContent = job.statusMessage;
    } else {
        jobForm.style.display = 'block';
        statusContainer.textContent = job?.statusMessage || "No active job.";
        processListBtn.disabled = false;
        processListBtn.textContent = "Process Shopping List";
    }
}

function initializePopup() {
    const shoppingListTextArea = document.getElementById('shoppingList') as HTMLTextAreaElement;
    const processListBtn = document.getElementById('processListBtn') as HTMLButtonElement;

    if (!shoppingListTextArea || !processListBtn) { return; }

    chrome.storage.session.get('shoppingJob', (result) => {
        updateUI(result['shoppingJob']);
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'session' && changes['shoppingJob']) {
            updateUI(changes['shoppingJob'].newValue);
        }
    });

    processListBtn.addEventListener('click', () => {
        const listText = shoppingListTextArea.value;
        const lines = listText.split('\n').filter(line => line.trim() !== '');
        const items: ShoppingListItem[] = [];
        const lineRegex = /^\s*([^,]+?)\s*(?:,\s*(\d+))?\s*$/;

        for (const line of lines) {
            const match = line.match(lineRegex);
            if (match) {
                items.push({
                    name: match[1].trim(),
                    quantity: match[2] ? parseInt(match[2], 10) : 1,
                });
            }
        }

        if (items.length > 0) {
            processListBtn.disabled = true;
            processListBtn.textContent = "Starting...";
            chrome.runtime.sendMessage({ action: "startShoppingJob", items: items });
        } else {
            alert("Please enter at least one item.");
        }
    });
}

document.addEventListener('DOMContentLoaded', initializePopup);

export { };
