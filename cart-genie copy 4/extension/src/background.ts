// src/background.ts

const JOB_STORAGE_KEY = 'shoppingJob';

type ShoppingJob = {
    items: string[];
    failedItems: string[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
    status: 'searching' | 'addingToCart' | 'idle';
};

function sendMessageToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

async function updateJob(job: ShoppingJob | null) {
    await chrome.storage.session.set({ [JOB_STORAGE_KEY]: job });
}

async function startNextSearch(job: ShoppingJob, tabId: number) {
    if (job.currentIndex >= job.items.length) {
        job.statusMessage = `Job finished! Success: ${job.items.length - job.failedItems.length}, Failed: ${job.failedItems.length}.`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);
        await sendMessageToTab(tabId, { action: "jobFinished" }).catch(e => console.warn(e.message));
        console.log('[BG] Job finished and cleanup complete.');
        return;
    }

    const currentItem = job.items[job.currentIndex];
    job.statusMessage = `Searching for "${currentItem}" (${job.currentIndex + 1}/${job.items.length})`;
    job.status = 'searching';
    await updateJob(job);

    console.log(`[BG] Sending 'executeSearch' for item: "${currentItem}"`);
    await sendMessageToTab(tabId, { action: "executeSearch", item: currentItem }).catch(e => console.error(e.message));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        const tabId = sender.tab?.id || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
        if (!tabId) { return; }

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
                await startNextSearch(newJob, tabId);
                sendResponse({ status: "Job started." });
                break;

            case "taskCompleted":
                const { [JOB_STORAGE_KEY]: currentJob } = await chrome.storage.session.get(JOB_STORAGE_KEY);
                if (currentJob) {
                    if (message.status === 'notFound') {
                        currentJob.failedItems.push(currentJob.items[currentJob.currentIndex]);
                    }
                    currentJob.currentIndex++;
                    await startNextSearch(currentJob, tabId);
                }
                break;

            case "contentScriptReady":
                const { [JOB_STORAGE_KEY]: job } = await chrome.storage.session.get(JOB_STORAGE_KEY);
                if (job?.isRunning && job.status === 'addingToCart') {
                    console.log('[BG] Content script is ready, sending "executeAddToCart" command.');
                    await sendMessageToTab(tabId, { action: 'executeAddToCart' }).catch(e => console.error(e.message));
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
            console.log('[BG] Page has loaded after search. Updating job status to "addingToCart".');
            job.status = 'addingToCart';
            job.statusMessage = `Page loaded. Waiting for content script to be ready...`;
            await updateJob(job);
        }
    }
});

export { };
