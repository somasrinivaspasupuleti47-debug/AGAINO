"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchListings = searchListings;
exports.autocomplete = autocomplete;
const crypto_1 = __importDefault(require("crypto"));
const Listing_1 = require("../listings/models/Listing");
const SearchSuggestion_1 = require("./SearchSuggestion");
const cache_1 = require("../../utils/cache");
const redis_1 = require("../../config/redis");
function hashParams(params) {
    return crypto_1.default.createHash('sha1').update(JSON.stringify(params)).digest('hex');
}
async function searchListings(query) {
    const { q, category, subcategory, condition, minPrice, maxPrice, lat, lng, radius, sort = 'newest', page = 1, limit = 20, } = query;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;
    const cacheKey = `search:${hashParams(query)}`;
    return (0, cache_1.getOrSet)(cacheKey, 300, async () => {
        // ── Build filter ──────────────────────────────────────────────────────────
        const filter = {
            status: 'published',
        };
        if (q) {
            filter.$text = { $search: q };
        }
        if (category)
            filter.category = category;
        if (subcategory)
            filter.subcategory = subcategory;
        if (condition)
            filter.condition = condition;
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined)
                filter.price.$gte = minPrice;
            if (maxPrice !== undefined)
                filter.price.$lte = maxPrice;
        }
        // Geospatial: $geoWithin with $centerSphere (radius in radians = metres / earth radius)
        if (lat !== undefined && lng !== undefined && radius !== undefined) {
            const EARTH_RADIUS_METRES = 6378100;
            filter['location.coordinates'] = {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radius / EARTH_RADIUS_METRES],
                },
            };
        }
        let sortSpec;
        switch (sort) {
            case 'price_asc':
                sortSpec = { price: 1 };
                break;
            case 'price_desc':
                sortSpec = { price: -1 };
                break;
            case 'relevance':
                sortSpec = q ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 };
                break;
            case 'newest':
            default:
                sortSpec = { createdAt: -1 };
        }
        // ── Featured first ────────────────────────────────────────────────────────
        const [featured, regular, total] = await Promise.all([
            Listing_1.Listing.find({ ...filter, isFeatured: true })
                .sort(sortSpec)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            Listing_1.Listing.find({ ...filter, isFeatured: false })
                .sort(sortSpec)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            Listing_1.Listing.countDocuments(filter),
        ]);
        // Deduplicate and merge featured first
        const seen = new Set();
        const merged = [];
        for (const l of [...featured, ...regular]) {
            const id = String(l._id);
            if (!seen.has(id)) {
                seen.add(id);
                merged.push(l);
            }
        }
        return {
            listings: merged.slice(0, safeLimit),
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
        };
    });
}
async function autocomplete(q) {
    const cacheKey = `autocomplete:${q.toLowerCase().trim()}`;
    const redis = (0, redis_1.getRedisClient)();
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
        return JSON.parse(cached);
    }
    const suggestions = await SearchSuggestion_1.SearchSuggestion.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(10)
        .lean();
    const results = suggestions.map((s) => s.text);
    await redis.set(cacheKey, JSON.stringify(results), 'EX', 60);
    return results;
}
//# sourceMappingURL=searchService.js.map