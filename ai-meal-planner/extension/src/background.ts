// src/background.ts
import { Job, ShoppingJob, PriceCheckJob, ShoppingListItem, FailedItem, PriceCheckItemResult, ScrapedProduct } from './shared/types';
import { CONFIG } from './shared/constants';
import { createLogger } from './shared/logger';
import { StoreFactory, StoreName } from './stores';

const logger = createLogger('BG');

// Track content script ready state per tab
const contentScriptReadyMap = new Map<number, boolean>();

/**
 * Wait for content script to signal it's ready, with timeout
 */
async function waitForContentScriptReady(tabId: number, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    // If already ready, return immediately
    if (contentScriptReadyMap.get(tabId)) {
        contentScriptReadyMap.delete(tabId); // Clear for next reload
        logger.info(`Content script already ready in tab ${tabId}`);
        return;
    }

    // Wait for ready signal or timeout
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (contentScriptReadyMap.get(tabId)) {
                clearInterval(checkInterval);
                contentScriptReadyMap.delete(tabId); // Clear for next reload
                logger.info(`Content script became ready in tab ${tabId}`);
                resolve();
            } else if (Date.now() - startTime > timeoutMs) {
                clearInterval(checkInterval);
                logger.warn(`Timeout waiting for content script in tab ${tabId}, proceeding anyway`);
                resolve();
            }
        }, 50); // Check every 50ms
    });
}

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

    // Wait for content script to be ready (with timeout)
    await waitForContentScriptReady(tabId, 5000);

    // Send search message - don't wait for response as page will navigate
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) throw new Error('Tab no longer exists');

        // Send message without waiting for response (Barbora navigates immediately)
        chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem }).catch(() => {
            // Ignore errors - page navigation is expected for Barbora
            logger.debug('Search message sent, page navigating (expected for Barbora)');
        });

        logger.info('✅ Search message sent successfully');
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

        // Send results back to the SOURCE tab (Web App) - only if NOT in multi-store mode
        if (job.sourceTabId && !job.multiStoreMode) {
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
        } else if (job.multiStoreMode) {
            logger.info(`Multi-store mode: skipping individual result send for ${job.currentStoreName}`);
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

    // Wait for content script to be ready (with timeout)
    await waitForContentScriptReady(tabId, 5000);

    // Send search message - don't wait for response as page will navigate
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) throw new Error('Tab no longer exists');

        // Send message without waiting for response (Barbora navigates immediately)
        chrome.tabs.sendMessage(tabId, { action: "executeSearch", item: currentItem }).catch(() => {
            // Ignore errors - page navigation is expected for Barbora
            logger.debug('Search message sent, page navigating (expected for Barbora)');
        });

        logger.info('✅ Search message sent successfully');
    } catch (error) {
        logger.error('Failed to send search message', error);
        // Record error for this item and move to next item immediately
        const updatedJob = await getJob();
        if (updatedJob && updatedJob.type === 'priceCheck' && updatedJob.targetTabId === tabId) {
            updatedJob.results.push({
                originalName: currentItem.name,
                products: [],
                error: 'Failed to communicate with tab'
            });
            updatedJob.currentIndex++;
            await updateJob(updatedJob);
            await startNextPriceCheckStep(updatedJob, tabId);
        }
    }
}

async function handleMultiStorePriceCheck(items: ShoppingListItem[], sourceTabId: number, stores: StoreName[]): Promise<{ status: string; message?: string }> {
    try {
        logger.info(`\n🚀 Starting multi-store price check for ${stores.length} stores: ${stores.join(', ')}`);
        logger.info(`   Items to check: ${items.length}`);
        logger.info(`   Source tab ID: ${sourceTabId}`);

        if (!items || items.length === 0) {
            logger.error('❌ No items provided for price check');
            return { status: "error", message: "No items provided" };
        }

        if (!stores || stores.length === 0) {
            logger.error('❌ No stores provided for price check');
            return { status: "error", message: "No stores provided" };
        }

        const allResults: { [storeName: string]: PriceCheckItemResult[] } = {};

        // Run price check for each store sequentially
        for (const storeName of stores) {
            logger.info(`\n========== Checking prices on ${storeName} ==========`);

            // Run single store price check in multi-store mode
            const result = await handleStartPriceCheckJob(items, sourceTabId, storeName, true);

            if (result.status === 'success') {
                // Wait for this store's price check to complete
                logger.info(`Waiting for ${storeName} price check to complete...`);
                await waitForPriceCheckCompletion(storeName);

                // Get results from completed job
                const job = await getJob();
                if (job && job.type === 'priceCheck') {
                    allResults[storeName] = job.results;
                    logger.info(`✅ Collected ${job.results.length} results from ${storeName}`);

                    // Close the store tab
                    if (job.targetTabId) {
                        await chrome.tabs.remove(job.targetTabId);
                        logger.info(`🗑️ Closed tab for ${storeName}`);
                    }

                    // Clear the job to prevent collision with next store
                    await updateJob(null);
                    logger.info(`🧹 Cleared job for ${storeName}`);

                    // Add delay before starting next store to ensure clean separation
                    if (stores.indexOf(storeName) < stores.length - 1) {
                        logger.info('⏳ Waiting 2 seconds before next store...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } else {
                    logger.warn(`⚠️ No job found after ${storeName} completion`);
                }
            } else {
                logger.error(`❌ Failed to start price check for ${storeName}: ${result.message}`);
            }
        }

        // Send aggregated results back to web app
        logger.info('All store price checks completed, sending aggregated results');
        await chrome.tabs.sendMessage(sourceTabId, {
            action: 'priceCheckFinished',
            results: allResults
        });

        return { status: "success", message: "Multi-store price check completed." };
    } catch (error) {
        logger.error('Error in multi-store price check', error);
        return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function waitForPriceCheckCompletion(storeName: string): Promise<void> {
    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            const job = await getJob();
            if (!job || !job.isRunning) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 5 * 60 * 1000);
    });
}

async function handleStartPriceCheckJob(items: ShoppingListItem[], sourceTabId: number, storeName: StoreName = 'barbora', multiStoreMode: boolean = false): Promise<{ status: string; message?: string }> {
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
            sourceTabId: sourceTabId,
            multiStoreMode: multiStoreMode,
            currentStoreName: storeName
        };
        await updateJob(newJob);

        logger.info(`⏳ Waiting for ${store.config.name} tab to load...`);
        // Wait a bit for the tab to start loading before returning
        await new Promise(resolve => setTimeout(resolve, 1000));

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
    if (message.action === 'contentScriptReady' && sender.tab?.id) {
        contentScriptReadyMap.set(sender.tab.id, true);
        logger.info(`✅ Content script ready in tab ${sender.tab.id}`);
        return false; // Don't send response
    }
    else if (message.action === "startShoppingJob") {
        handleStartShoppingJob(message.items, message.store || 'barbora').then(sendResponse);
        return true;
    }
    else if (message.action === "startPriceCheckJob") {
        const sourceTabId = sender.tab?.id || 0;
        const stores = message.stores || [message.store || 'barbora'];

        logger.info(`📨 Received startPriceCheckJob message`);
        logger.info(`   Items: ${message.items?.length || 0}`);
        logger.info(`   Stores: ${stores.join(', ')}`);
        logger.info(`   Source tab: ${sourceTabId}`);

        // Run price checks for all stores sequentially and aggregate results
        handleMultiStorePriceCheck(message.items, sourceTabId, stores).then(sendResponse);
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

    // ENHANCED DEBUG LOGGING
    if (job?.isRunning && job.targetTabId === tabId) {
        logger.info(`🔄 Tab ${tabId} update: status=${changeInfo.status}, url=${tab.url}, jobStatus=${job.status}, jobType=${job.type}`);
    }

    if (changeInfo.status !== 'complete') {
        return;
    }

    logger.info(`✅ Tab ${tabId} finished loading: ${tab.url}`);

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
