// Product matching utility with improved text similarity scoring

interface Product {
    name: string;
    [key: string]: any;
}

interface ScoredProduct<T extends Product> extends Product {
    matchScore: number;
    matchReason: string;
    originalProduct: T;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, higher is better)
 */
function stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

/**
 * Lithuanian common word endings for basic stemming
 */
const LITHUANIAN_ENDINGS = ['ų', 'us', 'ės', 'ė', 'os', 'as', 'is', 'ai', 'ių', 'ams', 'ais', 'uose'];

/**
 * Common words to ignore (articles, prepositions, etc.)
 */
const STOP_WORDS = new Set(['su', 'be', 'ir', 'arba', 'per', 'uz', 'po', 'prie', 'nuo', 'i', 'is']);

/**
 * Simple Lithuanian stemmer - removes common endings
 */
function stemWord(word: string): string {
    if (word.length <= 3) return word;

    for (const ending of LITHUANIAN_ENDINGS) {
        if (word.endsWith(ending) && word.length - ending.length >= 3) {
            return word.slice(0, -ending.length);
        }
    }
    return word;
}

/**
 * Normalize text for comparison (lowercase, remove extra spaces, remove diacritics, punctuation)
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[,\.;:!?%]/g, ' ') // Replace punctuation with spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract meaningful words (remove stop words, apply stemming)
 */
function extractKeywords(text: string): string[] {
    const normalized = normalizeText(text);
    const words = normalized.split(' ');

    return words
        .filter(word => word.length > 2 && !STOP_WORDS.has(word))
        .map(word => stemWord(word));
}

/**
 * Calculate match score for a product against a search query
 * Returns score from 0-100 (higher is better)
 */
function calculateMatchScore(productName: string, searchQuery: string): { score: number; reason: string } {
    const normalizedProduct = normalizeText(productName);
    const normalizedQuery = normalizeText(searchQuery);

    let score = 0;
    let reason = '';

    // 1. Exact match (case-insensitive) - highest priority
    if (normalizedProduct === normalizedQuery) {
        score = 100;
        reason = 'Exact match';
        return { score, reason };
    }

    // 2. Product name starts with query - very high priority
    if (normalizedProduct.startsWith(normalizedQuery)) {
        score = 95;
        reason = 'Starts with query';
        return { score, reason };
    }

    // Extract keywords (stemmed, no stop words)
    const productKeywords = extractKeywords(productName);
    const queryKeywords = extractKeywords(searchQuery);

    if (queryKeywords.length === 0) {
        return { score: 0, reason: 'No valid keywords' };
    }

    // 3. All query keywords match product keywords (stemmed)
    const matchedKeywords = queryKeywords.filter(queryKw =>
        productKeywords.some(prodKw =>
            prodKw === queryKw || // Exact stem match
            prodKw.includes(queryKw) || // Query stem is substring
            queryKw.includes(prodKw) // Product stem is substring
        )
    );

    const matchRatio = matchedKeywords.length / queryKeywords.length;

    if (matchRatio === 1.0) {
        // All keywords matched
        score = 85;
        reason = 'All keywords match';

        // Bonus: Keywords appear in same order
        const queryOrder = queryKeywords.join(' ');
        const productOrder = productKeywords.join(' ');
        if (productOrder.includes(queryOrder)) {
            score += 10;
            reason = 'All keywords in order';
        }
    } else if (matchRatio >= 0.7) {
        // Most keywords matched
        score = 60 + (matchRatio * 20);
        reason = `${matchedKeywords.length}/${queryKeywords.length} keywords match`;
    } else if (matchRatio > 0) {
        // Some keywords matched
        score = 40 + (matchRatio * 20);
        reason = `${matchedKeywords.length}/${queryKeywords.length} keywords match`;
    } else {
        // Fallback: Fuzzy string similarity
        const similarity = stringSimilarity(normalizedProduct, normalizedQuery);
        score = similarity * 35; // Max 35 points for fuzzy match
        reason = `Fuzzy match (${(similarity * 100).toFixed(0)}% similar)`;
    }

    // Bonus: Shorter product names are more relevant (less brand/description noise)
    const lengthRatio = normalizedQuery.length / normalizedProduct.length;
    if (lengthRatio > 0.4 && lengthRatio < 1.5) {
        score += 5;
    }

    // Penalty: Very long product names with many extra words
    if (productKeywords.length > queryKeywords.length * 3) {
        score -= 5;
    }

    return { score: Math.max(0, Math.min(score, 99)), reason }; // Cap at 99 (only exact match gets 100)
}

/**
 * Score and sort products by relevance to search query
 * Returns top N products with scores
 * Order: best match → 2 discounted items → remaining matches
 */
export function rankProducts<T extends Product>(
    products: T[],
    searchQuery: string,
    topN: number = 5
): ScoredProduct<T>[] {
    if (!products || products.length === 0) {
        return [];
    }

    const scoredProducts = products.map(product => {
        const { score, reason } = calculateMatchScore(product.name, searchQuery);
        return {
            ...product,
            matchScore: score,
            matchReason: reason,
            originalProduct: product
        };
    });

    // Sort by score (descending)
    scoredProducts.sort((a, b) => b.matchScore - a.matchScore);

    // Reorder: best match → 2 discounts → remaining matches
    if (scoredProducts.length > 1) {
        const bestMatch = scoredProducts[0];
        const rest = scoredProducts.slice(1);

        // Separate discounted and non-discounted items
        const discounted = rest.filter(p => (p as any).hasDiscount);
        const nonDiscounted = rest.filter(p => !(p as any).hasDiscount);

        // Take up to 2 discounted items
        const selectedDiscounts = discounted.slice(0, 2);

        // Fill remaining slots with non-discounted items
        const remainingSlots = topN - 1 - selectedDiscounts.length;
        const selectedNonDiscounts = nonDiscounted.slice(0, remainingSlots);

        // Combine: best match + discounts + remaining
        return [bestMatch, ...selectedDiscounts, ...selectedNonDiscounts].slice(0, topN);
    }

    // Return top N (or all if less than N)
    return scoredProducts.slice(0, Math.min(topN, scoredProducts.length));
}

/**
 * Get best matching product (highest score)
 */
export function getBestMatch<T extends Product>(
    products: T[],
    searchQuery: string
): ScoredProduct<T> | null {
    const ranked = rankProducts(products, searchQuery, 1);
    return ranked.length > 0 ? ranked[0] : null;
}
