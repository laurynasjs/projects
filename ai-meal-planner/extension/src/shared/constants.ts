export const CONFIG = {
    TIMEOUTS: {
        ELEMENT_WAIT: 7000,
        SEARCH_DELAY_MIN: 250,
        SEARCH_DELAY_MAX: 750,
        ITEM_DELAY: 2000,
        QUANTITY_CLICK_DELAY: 250,
    },
    SELECTORS: {
        SEARCH_INPUT: '#fti-search',
        SEARCH_BUTTON: '#fti-initiate-search',
        // Barbora uses Shadow DOM attached to these elements
        PRODUCT_CARD: 'div.next_scoped.product-card-next',
        SHADOW_HOST: 'div[id^="fti-product-card"]',  // Shadow root is attached here
        UNIT_PRICE: 'div.text-2xs',
        ADD_TO_CART_TEXT: 'Į krepšelį',
        INCREASE_QUANTITY_ARIA: 'Didinti prekės kiekį',
        DECREASE_QUANTITY_ARIA: 'Mažinti prekės kiekį',
    },
    MAX_RETRIES: 2,
    STORAGE_KEY: 'shoppingJob',
    BARBORA_URL: 'https://www.barbora.lt/',
} as const;
