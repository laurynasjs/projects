// src/popup.ts

type ShoppingJob = {
    items: string[];
    failedItems: string[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
};

function updateUI(job: ShoppingJob | null) {
    const jobForm = document.getElementById('job-form');
    const statusContainer = document.getElementById('status-container');
    const processListBtn = document.getElementById('processListBtn') as HTMLButtonElement;

    if (!jobForm || !statusContainer || !processListBtn) {
        return;
    }

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

    if (!shoppingListTextArea || !processListBtn) {
        return;
    }

    chrome.storage.session.get('shoppingJob', (result) => {
        updateUI(result['shoppingJob']);
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'session' && changes['shoppingJob']) {
            updateUI(changes['shoppingJob'].newValue);
        }
    });

    processListBtn.addEventListener('click', () => {
        const items = shoppingListTextArea.value.split('\n').filter(item => item.trim() !== '');
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
