export type ShoppingListItem = {
    name: string;
    quantity: number;
};

export type FailedItem = {
    name: string;
    reason: string;
};

export type ScrapedProduct = {
    name: string;
    price: number;
    unitPrice: number;
    unit: string;
    imageUrl?: string;
    available: boolean;
    url?: string;
};

export type PriceCheckItemResult = {
    originalName: string;
    products: ScrapedProduct[];
    error?: string;
};

export type ShoppingJob = {
    type: 'shopping';
    items: ShoppingListItem[];
    failedItems: FailedItem[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
    status: 'searching' | 'addingToCart' | 'idle';
    targetTabId?: number;
    retryCount: number;
};

export type PriceCheckJob = {
    type: 'priceCheck';
    items: ShoppingListItem[];
    results: PriceCheckItemResult[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
    status: 'searching' | 'scraping' | 'idle';
    targetTabId?: number;
    sourceTabId?: number; // The Web App tab requesting the check
};

export type Job = ShoppingJob | PriceCheckJob;

export type MessageAction =
    | { action: 'startShoppingJob'; items: ShoppingListItem[] }
    | { action: 'startPriceCheckJob'; items: ShoppingListItem[] }
    | { action: 'taskCompleted'; status: 'success' | 'notFound'; reason?: string }
    | { action: 'scrapeCompleted'; products: ScrapedProduct[] }
    | { action: 'executeSearch'; item: ShoppingListItem }
    | { action: 'executeAddToCart'; item: ShoppingListItem }
    | { action: 'executeScrape'; item: ShoppingListItem }
    | { action: 'jobFinished' }
    | { action: 'priceCheckFinished'; results: PriceCheckItemResult[] }
    | { action: 'manualTask'; task: string };
