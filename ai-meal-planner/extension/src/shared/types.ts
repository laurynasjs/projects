export type ShoppingListItem = {
    name: string;
    quantity: number;
};

export type FailedItem = {
    name: string;
    reason: string;
};

export type ShoppingJob = {
    items: ShoppingListItem[];
    failedItems: FailedItem[];
    currentIndex: number;
    statusMessage: string;
    isRunning: boolean;
    status: 'searching' | 'addingToCart' | 'idle';
    targetTabId?: number;
    retryCount: number;
};

export type MessageAction =
    | { action: 'startShoppingJob'; items: ShoppingListItem[] }
    | { action: 'taskCompleted'; status: 'success' | 'notFound'; reason?: string }
    | { action: 'executeSearch'; item: ShoppingListItem }
    | { action: 'executeAddToCart'; item: ShoppingListItem }
    | { action: 'jobFinished' };
