// src/popup.ts

// A type for a single item in the shopping list, now including quantity.
type ShoppingListItem = {
    name: string;
    quantity: number;
};

document.addEventListener('DOMContentLoaded', () => {
    const shoppingListTextArea = document.getElementById('shoppingList') as HTMLTextAreaElement;
    const processListBtn = document.getElementById('processListBtn');

    processListBtn?.addEventListener('click', () => {
        const listText = shoppingListTextArea.value;
        const lines = listText.split('\n').filter(line => line.trim() !== '');
        const items: ShoppingListItem[] = [];

        // --- CORRECTED REGEX ---
        // This version accepts a space OR a comma as the separator for the quantity.
        const lineRegex = /^\s*(.+?)\s*(?:[,\s]+(\d+))?\s*$/;

        for (const line of lines) {
            const match = line.match(lineRegex);
            if (match) {
                // Check if the last part is a number. If so, it's the quantity.
                const potentialQuantity = match[2] ? parseInt(match[2], 10) : NaN;
                if (!isNaN(potentialQuantity)) {
                    items.push({
                        name: match[1].trim(),
                        quantity: potentialQuantity,
                    });
                } else {
                    // If no valid number is found, treat the whole line as the item name.
                    items.push({
                        name: line.trim(),
                        quantity: 1,
                    });
                }
            }
        }

        if (items.length > 0) {
            chrome.runtime.sendMessage({ action: "startShoppingJob", items: items });
            window.close();
        } else {
            alert("Please enter at least one item in a valid format (e.g., 'Pienas' or 'Miltai 2').");
        }
    });
});

export { };
