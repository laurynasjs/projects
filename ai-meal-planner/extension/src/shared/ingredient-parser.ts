// Utility to parse ingredient strings and calculate package quantities

export interface ParsedIngredient {
    name: string;           // Just the ingredient name (e.g., "bulvės")
    neededAmount: number;   // Amount needed in base units (grams or ml)
    unit: 'g' | 'ml' | 'vnt' | 'none';
    originalString: string; // Original full string
}

/**
 * Parse ingredient string like "bulvės 500g" into name and needed amount
 */
export function parseIngredient(ingredientString: string): ParsedIngredient {
    const original = ingredientString.trim();

    // Match patterns like "bulvės 500g", "pienas 1l", "morkos 3vnt"
    const patterns = [
        /^(.+?)\s+(\d+(?:\.\d+)?)(kg|g)$/i,      // Weight: "bulvės 500g" or "bulvės 1kg"
        /^(.+?)\s+(\d+(?:\.\d+)?)(l|ml)$/i,      // Volume: "pienas 1l" or "aliejus 50ml"
        /^(.+?)\s+(\d+)(vnt)$/i,                 // Count: "morkos 3vnt"
    ];

    for (const pattern of patterns) {
        const match = original.match(pattern);
        if (match) {
            const name = match[1].trim();
            const amount = parseFloat(match[2]);
            const unit = match[3].toLowerCase();

            // Convert to base units (grams or ml)
            let neededAmount = amount;
            let baseUnit: 'g' | 'ml' | 'vnt' = 'g';

            if (unit === 'kg') {
                neededAmount = amount * 1000;
                baseUnit = 'g';
            } else if (unit === 'g') {
                baseUnit = 'g';
            } else if (unit === 'l') {
                neededAmount = amount * 1000;
                baseUnit = 'ml';
            } else if (unit === 'ml') {
                baseUnit = 'ml';
            } else if (unit === 'vnt') {
                baseUnit = 'vnt';
            }

            return {
                name,
                neededAmount,
                unit: baseUnit,
                originalString: original
            };
        }
    }

    // No quantity found - return as-is (e.g., "druska")
    return {
        name: original,
        neededAmount: 1,
        unit: 'none',
        originalString: original
    };
}

/**
 * Parse product package size from scraped product name
 * Examples: "Bulvės 1kg", "Varškė 200g", "Pienas 1L"
 */
export function parsePackageSize(productName: string): { size: number; unit: 'g' | 'ml' | 'vnt' } | null {
    const patterns = [
        /(\d+(?:\.\d+)?)\s*(kg|g)/i,     // Weight
        /(\d+(?:\.\d+)?)\s*(l|ml)/i,     // Volume
        /(\d+)\s*(vnt|vnt\.)/i,          // Count
    ];

    for (const pattern of patterns) {
        const match = productName.match(pattern);
        if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2].toLowerCase();

            // Convert to base units
            if (unit === 'kg') {
                return { size: amount * 1000, unit: 'g' };
            } else if (unit === 'g') {
                return { size: amount, unit: 'g' };
            } else if (unit === 'l') {
                return { size: amount * 1000, unit: 'ml' };
            } else if (unit === 'ml') {
                return { size: amount, unit: 'ml' };
            } else if (unit === 'vnt' || unit === 'vnt.') {
                return { size: amount, unit: 'vnt' };
            }
        }
    }

    return null;
}

/**
 * Estimate weight per piece for common vegetables (in grams)
 * Used when recipe specifies pieces but product is sold by weight
 */
const AVERAGE_WEIGHTS: Record<string, number> = {
    'paprikos': 200,      // Bell pepper ~200g
    'paprika': 200,
    'pomidorai': 150,     // Tomato ~150g
    'pomidoras': 150,
    'agurkai': 200,       // Cucumber ~200g
    'agurkas': 200,
    'svogūnai': 150,      // Onion ~150g
    'svogūnas': 150,
    'bulvės': 150,        // Potato ~150g
    'bulvė': 150,
    'morkos': 100,        // Carrot ~100g
    'morka': 100,
    'baklažanai': 300,    // Eggplant ~300g
    'baklažanas': 300,
    'cukinijos': 300,     // Zucchini ~300g
    'cukinija': 300,
};

/**
 * Estimate total weight needed based on ingredient name and piece count
 */
function estimateWeightFromPieces(ingredientName: string, pieceCount: number): number | null {
    const nameLower = ingredientName.toLowerCase().trim();

    for (const [veggie, weightPerPiece] of Object.entries(AVERAGE_WEIGHTS)) {
        if (nameLower.includes(veggie)) {
            return pieceCount * weightPerPiece;
        }
    }

    return null;
}

/**
 * Calculate how many packages to buy based on recipe needs and package size
 */
export function calculatePackagesNeeded(
    neededAmount: number,
    neededUnit: 'g' | 'ml' | 'vnt' | 'none',
    packageSize: number,
    packageUnit: 'g' | 'ml' | 'vnt',
    ingredientName?: string
): number {
    // If no quantity specified (e.g., spices), buy 1 package
    if (neededUnit === 'none') {
        return 1;
    }

    // Handle unit mismatch: recipe wants pieces (vnt) but product sold by weight (g)
    if (neededUnit === 'vnt' && packageUnit === 'g' && ingredientName) {
        const estimatedWeight = estimateWeightFromPieces(ingredientName, neededAmount);
        if (estimatedWeight) {
            // Calculate how many packages needed based on estimated weight
            const packagesNeeded = Math.ceil(estimatedWeight / packageSize);
            return packagesNeeded;
        }
        // If we can't estimate, buy 1 package as fallback
        return 1;
    }

    // Handle unit mismatch: recipe wants weight but product sold by pieces
    if (neededUnit === 'g' && packageUnit === 'vnt' && ingredientName) {
        const estimatedWeight = estimateWeightFromPieces(ingredientName, packageSize);
        if (estimatedWeight) {
            // Calculate how many pieces needed
            const piecesNeeded = Math.ceil(neededAmount / estimatedWeight);
            return piecesNeeded;
        }
        return 1;
    }

    // Other unit mismatches - buy 1 package
    if (neededUnit !== packageUnit) {
        return 1;
    }

    // For countable items (vnt), match exactly
    if (neededUnit === 'vnt') {
        return neededAmount;
    }

    // For weight/volume, calculate packages needed (round up)
    const packagesNeeded = Math.ceil(neededAmount / packageSize);
    return packagesNeeded;
}
