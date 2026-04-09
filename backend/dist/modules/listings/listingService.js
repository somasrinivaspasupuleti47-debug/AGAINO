"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateListingSchema = exports.createListingSchema = void 0;
exports.canTransition = canTransition;
exports.invalidateListingCache = invalidateListingCache;
exports.createListing = createListing;
exports.updateListing = updateListing;
exports.deleteListing = deleteListing;
exports.getMyListings = getMyListings;
exports.publishListing = publishListing;
exports.markSold = markSold;
exports.getPublicFeed = getPublicFeed;
exports.getListingById = getListingById;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
const Listing_1 = require("./models/Listing");
const AppError_1 = require("../../utils/AppError");
const emailQueue_1 = require("../../jobs/emailQueue");
const redis_1 = require("../../config/redis");
const cache_1 = require("../../utils/cache");
// ── Zod schema ────────────────────────────────────────────────────────────────
exports.createListingSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(2000),
    price: zod_1.z.number().min(0),
    category: zod_1.z.string().min(1),
    subcategory: zod_1.z.string().min(1),
    condition: zod_1.z.enum(['new', 'used']),
    location: zod_1.z.object({
        city: zod_1.z.string().min(1),
        region: zod_1.z.string().min(1),
        coordinates: zod_1.z
            .object({
            type: zod_1.z.literal('Point'),
            coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
        })
            .optional(),
    }),
    images: zod_1.z
        .array(zod_1.z.object({
        original: zod_1.z.string(),
        thumbnail: zod_1.z.string(),
    }))
        .optional()
        .default([]),
    expiresAt: zod_1.z.coerce.date().optional(),
    isFeatured: zod_1.z.boolean().optional().default(false),
});
exports.updateListingSchema = exports.createListingSchema.partial();
const ALLOWED_TRANSITIONS = {
    draft: ['published', 'archived'],
    published: ['sold', 'archived'],
    sold: [],
    archived: [], // archived → published is admin-only, handled separately
};
const ADMIN_ONLY_TRANSITIONS = [['archived', 'published']];
function canTransition(from, to, isAdmin) {
    // Check admin-only transitions
    for (const [f, t] of ADMIN_ONLY_TRANSITIONS) {
        if (f === from && t === to) {
            return isAdmin;
        }
    }
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
// ── Cache invalidation ────────────────────────────────────────────────────────
async function invalidateListingCache(listingId) {
    const redis = (0, redis_1.getRedisClient)();
    const patterns = ['feed:*', 'search:*', `listing:${listingId}`];
    for (const pattern of patterns) {
        if (pattern.includes('*')) {
            // SCAN + DEL for wildcard patterns
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== '0');
        }
        else {
            await redis.del(pattern);
        }
    }
}
// ── Service functions ─────────────────────────────────────────────────────────
async function createListing(sellerId, data) {
    const listing = await Listing_1.Listing.create({
        ...data,
        sellerId: new mongoose_1.Types.ObjectId(sellerId),
        status: 'draft',
    });
    return listing;
}
async function updateListing(listingId, sellerId, data, isAdmin) {
    const listing = await Listing_1.Listing.findById(listingId);
    if (!listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (!isAdmin && listing.sellerId.toString() !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    // Prevent direct status changes via update — use dedicated endpoints
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status: _status, ...safeUpdateData } = data;
    Object.assign(listing, safeUpdateData);
    await listing.save();
    return listing;
}
async function deleteListing(listingId, sellerId) {
    const listing = await Listing_1.Listing.findById(listingId);
    if (!listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (listing.sellerId.toString() !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    // Delete image files from disk
    if (listing.images?.length) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        for (const img of listing.images) {
            const originalPath = path.resolve(__dirname, '../../../../uploads', img.original.replace('/uploads/', ''));
            const thumbnailPath = path.resolve(__dirname, '../../../../uploads', img.thumbnail.replace('/uploads/', ''));
            await fs.unlink(originalPath).catch(() => { });
            await fs.unlink(thumbnailPath).catch(() => { });
        }
    }
    await Listing_1.Listing.findByIdAndDelete(listingId);
    await invalidateListingCache(listingId);
}
async function getMyListings(sellerId) {
    return Listing_1.Listing.find({ sellerId: new mongoose_1.Types.ObjectId(sellerId) }).sort({ createdAt: -1 });
}
async function publishListing(listingId, sellerId) {
    const listing = await Listing_1.Listing.findById(listingId);
    if (!listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (listing.sellerId.toString() !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    if (!canTransition(listing.status, 'published', false)) {
        throw new AppError_1.AppError(`Cannot transition from ${listing.status} to published`, 400);
    }
    listing.status = 'published';
    await listing.save();
    await (0, emailQueue_1.enqueueAdminEmail)('admin.listing.published', {
        listingId: listing._id.toString(),
        title: listing.title,
        sellerId: listing.sellerId.toString(),
    });
    await invalidateListingCache(listingId);
    return listing;
}
async function markSold(listingId, sellerId) {
    const listing = await Listing_1.Listing.findById(listingId);
    if (!listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (listing.sellerId.toString() !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    if (!canTransition(listing.status, 'sold', false)) {
        throw new AppError_1.AppError(`Cannot transition from ${listing.status} to sold`, 400);
    }
    listing.status = 'sold';
    await listing.save();
    await (0, emailQueue_1.enqueueAdminEmail)('admin.listing.sold', {
        listingId: listing._id.toString(),
        title: listing.title,
        sellerId: listing.sellerId.toString(),
    });
    await invalidateListingCache(listingId);
    return listing;
}
async function getPublicFeed(page, limit) {
    const cacheKey = `feed:home:${page}`;
    return (0, cache_1.getOrSet)(cacheKey, 300, async () => {
        const skip = (page - 1) * limit;
        const [featured, regular, total] = await Promise.all([
            Listing_1.Listing.find({ status: 'published', isFeatured: true })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Listing_1.Listing.find({ status: 'published', isFeatured: false })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Listing_1.Listing.countDocuments({ status: 'published' }),
        ]);
        // Merge featured first, then regular, deduplicate by id
        const seen = new Set();
        const merged = [];
        for (const l of [...featured, ...regular]) {
            const id = l._id.toString();
            if (!seen.has(id)) {
                seen.add(id);
                merged.push(l);
            }
        }
        return {
            listings: merged.slice(0, limit),
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    });
}
async function getListingById(id) {
    return (0, cache_1.getOrSet)(`listing:${id}`, 300, async () => {
        const listing = await Listing_1.Listing.findOne({ _id: id, status: 'published' });
        if (!listing)
            throw new AppError_1.AppError('Listing not found', 404);
        return listing;
    });
}
//# sourceMappingURL=listingService.js.map