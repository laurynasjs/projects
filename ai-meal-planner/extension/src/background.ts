// src/background.ts
import { ShoppingJob, ShoppingListItem, FailedItem } from './shared/types';
import { CONFIG } from './shared/constants';
import { createLogger } from './shared/logger';

const logger = createLogger('BG');

async function updateJob(job: ShoppingJob | null): Promise<void> {
    await chrome.storage.session.set({ [CONFIG.STORAGE_KEY]: job });
    if (job) {
        logger.debug(`Job updated: ${job.statusMessage}`);
    }
}

async function getJob(): Promise<ShoppingJob | null> {
    const result = await chrome.storage.session.get(CONFIG.STORAGE_KEY);
    return result[CONFIG.STORAGE_KEY] || null;
}

async function startNextSearch(job: ShoppingJob, tabId: number): Promise<void> {
    if (job.currentIndex >= job.items.length) {
        const successCount = job.items.length - job.failedItems.length;
        job.statusMessage = `Job finished! Success: ${successCount}, Failed: ${job.failedItems.length}`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);

        logger.info(`Job completed. Success: ${successCount}, Failed: ${job.failedItems.length}`);

        try {
            // Check if tab still exists before sending message
            const tab = await chrome.tabs.get(tabId);
            if (tab) {
                await chrome.tabs.sendMessage(tabId, { action: "jobFinished", failedItems: job.failedItems });
            }
        } catch (error) {
            // Tab was closed or navigated away - this is normal, just log it
            logger.debug('Tab no longer available for job finished message (tab may have been closed)');
        }
        return;
    }

    const currentItem = job.items[job.currentIndex];
    job.statusMessage = `Searching for "${currentItem.name}" (${job.currentIndex + 1}/${job.items.length})`;
    job.status = 'searching';
    job.retryCount = 0;
    await updateJob(job);

    logger.info(`Starting search for: ${currentItem.name}`);

    try {
        // Check if tab still exists
        const tab = await chrome.tabs.get(tabId);
        if (!tab) {
            throw new Error('Tab no longer exists');
        }
        await chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem });
    } catch (error) {
        logger.error('Failed to send search message', error);
        job.failedItems.push({ name: currentItem.name, reason: 'Failed to communicate with tab' });
        job.currentIndex++;
        await startNextSearch(job, tabId);
    }
}

async function handleStartShoppingJob(items: ShoppingListItem[]): Promise<{ status: string; message?: string }> {
    try {
        logger.info(`Starting shopping job with ${items.length} items`);

        const barboraTab = await chrome.tabs.create({ url: CONFIG.BARBORA_URL, active: true });

        if (!barboraTab.id) {
            throw new Error("Failed to create a new tab for the job.");
        }

        const newJob: ShoppingJob = {
            items,
            failedItems: [],
            currentIndex: 0,
            statusMessage: "Navigating to Barbora...",
            isRunning: true,
            status: 'idle',
            targetTabId: barboraTab.id,
            retryCount: 0,
        };
        await updateJob(newJob);

        return { status: "success", message: "Job initiated, opening new tab." };
    } catch (error) {
        logger.error('Error starting shopping job', error);
        return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function handleTaskCompleted(status: 'success' | 'notFound', reason?: string): Promise<void> {
    const currentJob = await getJob();

    if (!currentJob || !currentJob.targetTabId) {
        logger.warn('Task completed but no active job found');
        return;
    }

    const currentItem = currentJob.items[currentJob.currentIndex];

    if (status === 'notFound') {
        logger.warn(`Item not found: ${currentItem.name}. Reason: ${reason || 'Unknown'}`);
        currentJob.failedItems.push({
            name: currentItem.name,
            reason: reason || 'Item not found or could not be added to cart'
        });
    } else {
        logger.info(`Successfully added to cart: ${currentItem.name}`);
    }

    currentJob.currentIndex++;
    await startNextSearch(currentJob, currentJob.targetTabId);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startShoppingJob") {
        handleStartShoppingJob(message.items).then(sendResponse);
        return true;
    } else if (message.action === "taskCompleted") {
        handleTaskCompleted(message.status, message.reason).then(() => {
            sendResponse({ status: "acknowledged" });
        });
        return true;
    }
    return false;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url?.includes('barbora.lt')) {
        return;
    }

    const job = await getJob();

    if (job?.isRunning && job.targetTabId === tabId) {
        if (job.status === 'idle') {
            logger.info(`Target tab ${tabId} loaded. Starting first search.`);
            await startNextSearch(job, tabId);
        } else if (job.status === 'searching') {
            logger.info(`Target tab ${tabId} reloaded after search. Adding to cart.`);
            job.status = 'addingToCart';
            const currentItem = job.items[job.currentIndex];
            job.statusMessage = `Page loaded. Adding "${currentItem.name}" to cart...`;
            await updateJob(job);

            try {
                // Check if tab still exists
                const tab = await chrome.tabs.get(tabId);
                if (!tab) {
                    throw new Error('Tab no longer exists');
                }
                await chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart', item: currentItem });
            } catch (error) {
                logger.error('Failed to send add to cart message', error);
                job.failedItems.push({ name: currentItem.name, reason: 'Failed to communicate with tab' });
                job.currentIndex++;
                await startNextSearch(job, tabId);
            }
        }
    }
});

export { };
