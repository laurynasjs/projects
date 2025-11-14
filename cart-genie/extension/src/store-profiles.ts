export interface StoreProfile {
    name: string;
    url: string;
    searchInputSelector: string;
    searchButtonSelector: string;
    productCardSelector: string;
    productUnitPriceSelector: string; // Path within the card's shadow DOM
    addToCartButtonSelector: string; // Text or selector within the card's shadow DOM
    increaseQuantityButtonAriaLabel: string;
}

export const storeProfiles: { [key: string]: StoreProfile } = {
    barbora: {
        name: 'Barbora',
        url: 'https://www.barbora.lt/',
        searchInputSelector: '#fti-search',
        searchButtonSelector: '#fti-initiate-search',
        productCardSelector: 'li[data-testid^="product-card"]',
        productUnitPriceSelector: 'div.text-2xs',
        addToCartButtonSelector: 'Į krepšelį', // We'll find this by text content
        increaseQuantityButtonAriaLabel: 'Didinti prekės kiekį',
    },
    lastmile: {
        name: 'Last Mile',
        url: 'https://lastmile.lt/parduotuves', // Example URL
        // --- NOTE: These are HYPOTHETICAL selectors for Last Mile. You will need to inspect their website to find the real ones. ---
        searchInputSelector: 'input[data-testid="search-input"]',
        searchButtonSelector: 'button[data-testid="search-button"]',
        productCardSelector: 'div[data-testid="product-item"]',
        productUnitPriceSelector: 'span[data-testid="unit-price"]', // Assuming no shadow DOM for simplicity
        addToCartButtonSelector: 'button[data-testid="add-to-cart-button"]', // Assuming a selector is better here
        increaseQuantityButtonAriaLabel: 'Pridėti',
    }
    // You can add more stores here in the future
};