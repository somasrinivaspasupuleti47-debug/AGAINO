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
exports.createListing = createListing;
exports.updateListing = updateListing;
exports.deleteListing = deleteListing;
exports.getMyListings = getMyListings;
exports.publishListing = publishListing;
exports.markSold = markSold;
exports.getPublicFeed = getPublicFeed;
exports.getListingById = getListingById;
const zod_1 = require("zod");
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
const emailQueue_1 = require("../../jobs/emailQueue");
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
// ── Service functions ─────────────────────────────────────────────────────────
async function createListing(sellerId, data) {
    const { data: listing, error } = await supabase_1.supabase
        .from('listings')
        .insert({
        ...data,
        seller_id: sellerId,
        status: 'draft',
    })
        .select()
        .single();
    if (error)
        throw new AppError_1.AppError(error.message, 500);
    return listing;
}
async function updateListing(listingId, sellerId, data, isAdmin) {
    const { data: listing, error: fetchError } = await supabase_1.supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
    if (fetchError || !listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (!isAdmin && listing.seller_id !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    // Prevent direct status changes via update
    const { status: _status, ...safeUpdateData } = data;
    const { data: updated, error: updateError } = await supabase_1.supabase
        .from('listings')
        .update(safeUpdateData)
        .eq('id', listingId)
        .select()
        .single();
    if (updateError)
        throw new AppError_1.AppError(updateError.message, 500);
    return updated;
}
async function deleteListing(listingId, sellerId) {
    const { data: listing, error: fetchError } = await supabase_1.supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
    if (fetchError || !listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (listing.seller_id !== sellerId) {
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
    await supabase_1.supabase.from('listings').delete().eq('id', listingId);
}
async function getMyListings(sellerId) {
    const { data, error } = await supabase_1.supabase
        .from('listings')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
    if (error)
        throw new AppError_1.AppError(error.message, 500);
    return data;
}
async function publishListing(listingId, sellerId) {
    const { data: listing, error: fetchError } = await supabase_1.supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
    if (fetchError || !listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (listing.seller_id !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    if (!canTransition(listing.status, 'published', false)) {
        throw new AppError_1.AppError(`Cannot transition from ${listing.status} to published`, 400);
    }
    const { data: updated, error: updateError } = await supabase_1.supabase
        .from('listings')
        .update({ status: 'published' })
        .eq('id', listingId)
        .select()
        .single();
    if (updateError)
        throw new AppError_1.AppError(updateError.message, 500);
    await (0, emailQueue_1.enqueueAdminEmail)('admin.listing.published', {
        listingId: updated.id,
        title: updated.title,
        sellerId: updated.seller_id,
    });
    return updated;
}
async function markSold(listingId, sellerId) {
    const { data: listing, error: fetchError } = await supabase_1.supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
    if (fetchError || !listing)
        throw new AppError_1.AppError('Listing not found', 404);
    if (listing.seller_id !== sellerId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    if (!canTransition(listing.status, 'sold', false)) {
        throw new AppError_1.AppError(`Cannot transition from ${listing.status} to sold`, 400);
    }
    const { data: updated, error: updateError } = await supabase_1.supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId)
        .select()
        .single();
    if (updateError)
        throw new AppError_1.AppError(updateError.message, 500);
    await (0, emailQueue_1.enqueueAdminEmail)('admin.listing.sold', {
        listingId: updated.id,
        title: updated.title,
        sellerId: updated.seller_id,
    });
    return updated;
}
async function getPublicFeed(page, limit) {
    const offset = (page - 1) * limit;
    // Supabase doesn't easily support the dual-sort merge in one query without complex logic
    // We'll fetch published listings ordered by featured DESC then created_at DESC
    const { data: listings, error, count, } = await supabase_1.supabase
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw new AppError_1.AppError(error.message, 500);
    return {
        listings,
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
    };
}
async function getListingById(id) {
    const { data: listing, error } = await supabase_1.supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();
    if (error || !listing)
        throw new AppError_1.AppError('Listing not found', 404);
    return listing;
}
//# sourceMappingURL=listingService.js.map