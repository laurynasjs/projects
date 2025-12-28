/**
 * Parse ingredient string to extract name and quantity
 * Examples: "bulvės 500g" → {name: "bulvės", amount: 500, unit: "g"}
 */
export function parseIngredient(ingredientString) {
    const str = ingredientString.trim();

    // Match patterns like "bulvės 500g", "pienas 1l", "morkos 3vnt"
    const patterns = [
        /^(.+?)\s+(\d+(?:\.\d+)?)(kg|g)$/i,      // Weight
        /^(.+?)\s+(\d+(?:\.\d+)?)(l|ml)$/i,      // Volume
        /^(.+?)\s+(\d+)(vnt)$/i,                 // Count
    ];

    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match) {
            const name = match[1].trim();
            const amount = parseFloat(match[2]);
            const unit = match[3].toLowerCase();

            // Convert to base units (grams or ml)
            let baseAmount = amount;
            let baseUnit = unit;

            if (unit === 'kg') {
                baseAmount = amount * 1000;
                baseUnit = 'g';
            } else if (unit === 'l') {
                baseAmount = amount * 1000;
                baseUnit = 'ml';
            }

            return { name, amount: baseAmount, unit: baseUnit, original: str };
        }
    }

    // No quantity found - return as-is (e.g., "druska")
    return { name: str, amount: null, unit: null, original: str };
}

/**
 * Format ingredient with amount and unit
 */
export function formatIngredient(name, amount, unit) {
    if (!amount || !unit) {
        return name;
    }

    // Convert back to user-friendly units
    if (unit === 'g' && amount >= 1000) {
        return `${name} ${amount / 1000}kg`;
    } else if (unit === 'ml' && amount >= 1000) {
        return `${name} ${amount / 1000}l`;
    } else {
        return `${name} ${amount}${unit}`;
    }
}

/**
 * Deduplicate and sum ingredient quantities
 * Input: ["bulvės 500g", "morkos 3vnt", "bulvės 300g", "druska"]
 * Output: ["bulvės 800g", "morkos 3vnt", "druska"]
 */
export function deduplicateIngredients(ingredients) {
    const ingredientMap = new Map();

    ingredients.forEach(ing => {
        const parsed = parseIngredient(ing);
        const key = parsed.name.toLowerCase();

        if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);

            // Only sum if both have quantities and same unit
            if (existing.amount && parsed.amount && existing.unit === parsed.unit) {
                existing.amount += parsed.amount;
            } else if (!existing.amount && parsed.amount) {
                // Replace no-quantity with quantity
                ingredientMap.set(key, parsed);
            }
            // If existing has quantity but new doesn't, keep existing
        } else {
            ingredientMap.set(key, parsed);
        }
    });

    // Convert back to strings
    return Array.from(ingredientMap.values()).map(item =>
        formatIngredient(item.name, item.amount, item.unit)
    );
}
