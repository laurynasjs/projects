// src/background.ts

const JOB_STORAGE_KEY = 'shoppingJob';

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
    status: 'searching' | 'addingToCart' | 'idle';
};

async function updateJob(job: ShoppingJob | null) {
    await chrome.storage.session.set({ [JOB_STORAGE_KEY]: job });
}

async function startNextSearch(job: ShoppingJob, tabId: number) {
    if (job.currentIndex >= job.items.length) {
        job.statusMessage = `Job finished! Success: ${job.items.length - job.failedItems.length}, Failed: ${job.failedItems.length}.`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);
        chrome.tabs.sendMessage(tabId, { action: "jobFinished" });
        return;
    }

    const currentItem = job.items[job.currentIndex];
    job.statusMessage = `Searching for "${currentItem.name}" (${job.currentIndex + 1}/${job.items.length})`;
    job.status = 'searching';
    await updateJob(job);
    chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            sendResponse({ status: "Error: No active tab found." });
            return;
        }

        switch (message.action) {
            case "startShoppingJob":
                const newJob: ShoppingJob = {
                    items: message.items,
                    failedItems: [],
                    currentIndex: 0,
                    statusMessage: "Starting shopping job...",
                    isRunning: true,
                    status: 'idle',
                };
                await startNextSearch(newJob, tab.id);
                sendResponse({ status: "Job started." });
                break;

            case "taskCompleted":
                const { [JOB_STORAGE_KEY]: currentJob } = await chrome.storage.session.get(JOB_STORAGE_KEY);
                if (currentJob) {
                    if (message.status === 'notFound') {
                        currentJob.failedItems.push(currentJob.items[currentJob.currentIndex].name);
                    }
                    currentJob.currentIndex++;
                    await startNextSearch(currentJob, tab.id);
                }
                break;
        }
    })();
    return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('barbora.lt')) {
        const { [JOB_STORAGE_KEY]: job } = await chrome.storage.session.get(JOB_STORAGE_KEY);
        if (job?.isRunning && job.status === 'searching') {
            job.status = 'addingToCart';
            const currentItem = job.items[job.currentIndex];
            job.statusMessage = `Page loaded. Adding "${currentItem.name}" to cart...`;
            await updateJob(job);
            chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart', item: currentItem });
        }
    }
});

export { };
