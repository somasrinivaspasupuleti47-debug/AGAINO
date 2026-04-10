"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchListings = searchListings;
exports.autocomplete = autocomplete;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
async function searchListings(query) {
    const { q, category, subcategory, condition, minPrice, maxPrice, sort = 'newest', page = 1, limit = 20, } = query;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;
    // ── Build Supabase Query ────────────────────────────────────────────────────
    let baseQuery = supabase_1.supabase
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('status', 'published');
    if (q) {
        baseQuery = baseQuery.textSearch('title', q, {
            type: 'websearch',
            config: 'english',
        });
    }
    if (category)
        baseQuery = baseQuery.eq('category', category);
    if (subcategory)
        baseQuery = baseQuery.eq('subcategory', subcategory);
    if (condition)
        baseQuery = baseQuery.eq('condition', condition);
    if (minPrice !== undefined)
        baseQuery = baseQuery.gte('price', minPrice);
    if (maxPrice !== undefined)
        baseQuery = baseQuery.lte('price', maxPrice);
    // Sorting
    switch (sort) {
        case 'price_asc':
            baseQuery = baseQuery.order('price', { ascending: true });
            break;
        case 'price_desc':
            baseQuery = baseQuery.order('price', { ascending: false });
            break;
        case 'relevance':
            // Relevance sorting is default for textSearch in Supabase, 
            // but we fallback to newest if no q.
            if (!q)
                baseQuery = baseQuery.order('created_at', { ascending: false });
            break;
        case 'newest':
        default:
            baseQuery = baseQuery.order('created_at', { ascending: false });
    }
    // Handle Featured first (simplified approach: internal ordering handles it)
    baseQuery = baseQuery.order('is_featured', { ascending: false });
    const { data: listings, error, count } = await baseQuery.range(offset, offset + safeLimit - 1);
    if (error)
        throw new AppError_1.AppError(error.message, 500);
    return {
        listings: listings || [],
        total: count || 0,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil((count || 0) / safeLimit),
    };
}
async function autocomplete(q) {
    // Simple implementation using distinct search on titles
    const { data, error } = await supabase_1.supabase
        .from('listings')
        .select('title')
        .ilike('title', `%${q}%`)
        .limit(10);
    if (error)
        return [];
    // Return unique titles
    return Array.from(new Set(data.map((item) => item.title)));
}
//# sourceMappingURL=searchService.js.map