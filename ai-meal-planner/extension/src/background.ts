// src/background.ts
import { Job, ShoppingJob, PriceCheckJob, ShoppingListItem, FailedItem, PriceCheckItemResult, ScrapedProduct } from './shared/types';
import { CONFIG } from './shared/constants';
import { createLogger } from './shared/logger';
import { StoreFactory, StoreName } from './stores';

const logger = createLogger('BG');

async function updateJob(job: Job | null): Promise<void> {
    await chrome.storage.session.set({ [CONFIG.STORAGE_KEY]: job });
    if (job) {
        logger.debug(`Job updated: ${job.statusMessage}`);
    }
}

async function getJob(): Promise<Job | null> {
    const result = await chrome.storage.session.get(CONFIG.STORAGE_KEY);
    return result[CONFIG.STORAGE_KEY] || null;
}

// SHOPPING JOB LOGIC
async function startNextShoppingStep(job: ShoppingJob, tabId: number): Promise<void> {
    if (job.currentIndex >= job.items.length) {
        const successCount = job.items.length - job.failedItems.length;
        job.statusMessage = `Job finished! Success: ${successCount}, Failed: ${job.failedItems.length}`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);

        logger.info(`Job completed. Success: ${successCount}, Failed: ${job.failedItems.length}`);

        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab) {
                await chrome.tabs.sendMessage(tabId, { action: "jobFinished", failedItems: job.failedItems });
            }
        } catch (error) {
            logger.debug('Tab no longer available for job finished message');
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
        const tab = await chrome.tabs.get(tabId);
        if (!tab) throw new Error('Tab no longer exists');
        await chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem });
    } catch (error) {
        logger.error('Failed to send search message', error);
        job.failedItems.push({ name: currentItem.name, reason: 'Failed to communicate with tab' });
        job.currentIndex++;
        await startNextShoppingStep(job, tabId);
    }
}

async function handleStartShoppingJob(items: ShoppingListItem[], storeName: StoreName = 'barbora'): Promise<{ status: string; message?: string }> {
    try {
        logger.info(`Starting shopping job with ${items.length} items on ${storeName}`);
        const store = StoreFactory.getStore(storeName);
        const storeTab = await chrome.tabs.create({ url: store.config.url, active: true });

        if (!storeTab.id) throw new Error("Failed to create a new tab for the job.");

        const newJob: ShoppingJob = {
            type: 'shopping',
            items,
            failedItems: [],
            currentIndex: 0,
            statusMessage: `Navigating to ${store.config.name}...`,
            isRunning: true,
            status: 'idle',
            targetTabId: storeTab.id,
            retryCount: 0,
        };
        await updateJob(newJob);

        return { status: "success", message: "Job initiated, opening new tab." };
    } catch (error) {
        logger.error('Error starting shopping job', error);
        return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// PRICE CHECK JOB LOGIC
async function startNextPriceCheckStep(job: PriceCheckJob, tabId: number): Promise<void> {
    if (job.currentIndex >= job.items.length) {
        job.statusMessage = `Price check finished! Processed ${job.items.length} items.`;
        job.isRunning = false;
        job.status = 'idle';
        await updateJob(job);

        logger.info(`Price check completed. Items: ${job.items.length}`);

        // Send results back to the SOURCE tab (Web App)
        if (job.sourceTabId) {
            try {
                // We need to send this to the Content Script of the Web App
                await chrome.tabs.sendMessage(job.sourceTabId, {
                    action: "priceCheckFinished",
                    results: job.results
                });
                logger.info(`Sent results to source tab ${job.sourceTabId}`);
            } catch (error) {
                logger.error(`Failed to send results to source tab ${job.sourceTabId}`, error);
            }
        }

        // Optionally close the Barbora tab since we are done
        // if (job.targetTabId) await chrome.tabs.remove(job.targetTabId);

        return;
    }

    const currentItem = job.items[job.currentIndex];
    job.statusMessage = `Checking price for "${currentItem.name}" (${job.currentIndex + 1}/${job.items.length})`;
    job.status = 'searching';
    await updateJob(job);

    logger.info(`Starting price check search for: ${currentItem.name}`);

    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) throw new Error('Barbora tab no longer exists');
        await chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem });
    } catch (error) {
        logger.error('Failed to send search message', error);
        // Record error for this item and move on
        job.results.push({
            originalName: currentItem.name,
            products: [],
            error: 'Failed to communicate with Barbora tab'
        });
        job.currentIndex++;
        await startNextPriceCheckStep(job, tabId);
    }
}

async function handleStartPriceCheckJob(items: ShoppingListItem[], sourceTabId: number, storeName: StoreName = 'barbora'): Promise<{ status: string; message?: string }> {
    try {
        logger.info(`Starting price check job with ${items.length} items from tab ${sourceTabId} on ${storeName}`);

        // Open store tab in background if possible, or just new tab
        const store = StoreFactory.getStore(storeName);
        const storeTab = await chrome.tabs.create({ url: store.config.url, active: false });

        if (!storeTab.id) throw new Error("Failed to create a new tab for the price check.");

        const newJob: PriceCheckJob = {
            type: 'priceCheck',
            items,
            results: [],
            currentIndex: 0,
            statusMessage: `Navigating to ${store.config.name} for price check...`,
            isRunning: true,
            status: 'idle',
            targetTabId: storeTab.id,
            sourceTabId: sourceTabId
        };
        await updateJob(newJob);

        return { status: "success", message: "Price check started." };
    } catch (error) {
        logger.error('Error starting price check job', error);
        return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function handleScrapeCompleted(products: ScrapedProduct[]): Promise<void> {
    const currentJob = await getJob();
    if (!currentJob || currentJob.type !== 'priceCheck' || !currentJob.targetTabId) {
        logger.warn('Scrape completed but no active price check job found');
        return;
    }

    const currentItem = currentJob.items[currentJob.currentIndex];
    logger.info(`Scrape completed for ${currentItem.name}. Found ${products.length} products.`);

    currentJob.results.push({
        originalName: currentItem.name,
        products: products
    });

    currentJob.currentIndex++;
    await startNextPriceCheckStep(currentJob, currentJob.targetTabId);
}

// SHARED LOGIC & LISTENERS

async function handleTaskCompleted(status: 'success' | 'notFound', reason?: string): Promise<void> {
    const currentJob = await getJob();

    if (!currentJob || currentJob.type !== 'shopping' || !currentJob.targetTabId) {
        logger.warn('Task completed but no active shopping job found');
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
    await startNextShoppingStep(currentJob, currentJob.targetTabId);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startShoppingJob") {
        handleStartShoppingJob(message.items, message.store || 'barbora').then(sendResponse);
        return true;
    }
    else if (message.action === "startPriceCheckJob") {
        const sourceTabId = sender.tab?.id || 0;
        handleStartPriceCheckJob(message.items, sourceTabId, message.store || 'barbora').then(sendResponse);
        return true;
    }
    else if (message.action === "taskCompleted") {
        handleTaskCompleted(message.status, message.reason).then(() => {
            sendResponse({ status: "acknowledged" });
        });
        return true;
    }
    else if (message.action === "scrapeCompleted") {
        handleScrapeCompleted(message.products).then(() => {
            sendResponse({ status: "acknowledged" });
        });
        return true;
    }
    else if (message.action === "searchCompleted") {
        // Handle search completion for SPA stores (like IKI) that don't trigger page reload
        logger.info('Received searchCompleted notification from content script');
        getJob().then(async (job) => {
            if (job && job.isRunning && job.status === 'searching') {
                const tabId = sender.tab?.id;
                if (tabId) {
                    logger.info('Search completed, triggering scrape...');
                    if (job.type === 'priceCheck') {
                        job.status = 'scraping';
                        const currentItem = job.items[job.currentIndex];
                        job.statusMessage = `Scraping prices for "${currentItem.name}"...`;
                        await updateJob(job);
                        try {
                            await chrome.tabs.sendMessage(tabId, { action: 'executeScrape', item: currentItem });
                        } catch (error) {
                            logger.error('Failed to send scrape message', error);
                            job.results.push({
                                originalName: currentItem.name,
                                products: [],
                                error: 'Failed to communicate with tab'
                            });
                            job.currentIndex++;
                            await startNextPriceCheckStep(job, tabId);
                        }
                    } else if (job.type === 'shopping') {
                        job.status = 'addingToCart';
                        const currentItem = job.items[job.currentIndex];
                        job.statusMessage = `Adding "${currentItem.name}" to cart...`;
                        await updateJob(job);
                        try {
                            await chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart', item: currentItem });
                        } catch (error) {
                            logger.error('Failed to send add to cart message', error);
                            job.failedItems.push({ name: currentItem.name, reason: 'Failed to communicate with tab' });
                            job.currentIndex++;
                            await startNextShoppingStep(job, tabId);
                        }
                    }
                }
            }
            sendResponse({ status: "acknowledged" });
        });
        return true;
    }
    return false;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Log all tab updates for debugging
    const job = await getJob();
    if (job?.isRunning && job.targetTabId === tabId) {
        logger.debug(`Tab ${tabId} update: status=${changeInfo.status}, url=${tab.url}, jobStatus=${job.status}`);
    }

    if (changeInfo.status !== 'complete') {
        return;
    }

    // Check if this is a supported store domain
    const isSupportedStore = tab.url?.includes('barbora.lt') ||
        tab.url?.includes('lastmile.lt') ||
        tab.url?.includes('rimi.lt') ||
        tab.url?.includes('maxima.lt');

    if (!isSupportedStore) {
        return;
    }

    if (job?.isRunning && job.targetTabId === tabId) {
        logger.info(`Tab ${tabId} completed loading. Job status: ${job.status}, URL: ${tab.url}`);

        if (job.status === 'idle') {
            logger.info(`Target tab ${tabId} loaded (${tab.url}). Starting first step.`);
            if (job.type === 'shopping') {
                await startNextShoppingStep(job, tabId);
            } else if (job.type === 'priceCheck') {
                await startNextPriceCheckStep(job, tabId);
            }
        }
        else if (job.status === 'searching') {
            // Page reloaded after search
            logger.info(`Target tab ${tabId} reloaded after search (${tab.url}).`);

            if (job.type === 'shopping') {
                job.status = 'addingToCart';
                const currentItem = job.items[job.currentIndex];
                job.statusMessage = `Page loaded. Adding "${currentItem.name}" to cart...`;
                await updateJob(job);
                try {
                    await chrome.tabs.sendMessage(tabId, { action: 'executeAddToCart', item: currentItem });
                } catch (error) {
                    logger.error('Failed to send add to cart message', error);
                    job.failedItems.push({ name: currentItem.name, reason: 'Failed to communicate with tab' });
                    job.currentIndex++;
                    await startNextShoppingStep(job, tabId);
                }
            }
            else if (job.type === 'priceCheck') {
                job.status = 'scraping';
                const currentItem = job.items[job.currentIndex];
                job.statusMessage = `Page loaded. Scraping prices for "${currentItem.name}"...`;
                await updateJob(job);
                try {
                    await chrome.tabs.sendMessage(tabId, { action: 'executeScrape', item: currentItem });
                } catch (error) {
                    logger.error('Failed to send scrape message', error);
                    job.results.push({
                        originalName: currentItem.name,
                        products: [],
                        error: 'Failed to communicate with tab'
                    });
                    job.currentIndex++;
                    await startNextPriceCheckStep(job, tabId);
                }
            }
        }
    }
});

export { };
