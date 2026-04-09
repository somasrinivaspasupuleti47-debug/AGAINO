import { Types } from 'mongoose';
import { z } from 'zod';
import { Listing } from './models/Listing';
import { AppError } from '../../utils/AppError';
import { enqueueAdminEmail } from '../../jobs/emailQueue';
import { getRedisClient } from '../../config/redis';
import { getOrSet } from '../../utils/cache';

// ── Zod schema ────────────────────────────────────────────────────────────────

export const createListingSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  price: z.number().min(0),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  condition: z.enum(['new', 'used']),
  location: z.object({
    city: z.string().min(1),
    region: z.string().min(1),
    coordinates: z
      .object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]),
      })
      .optional(),
  }),
  images: z
    .array(
      z.object({
        original: z.string(),
        thumbnail: z.string(),
      }),
    )
    .optional()
    .default([]),
  expiresAt: z.coerce.date().optional(),
  isFeatured: z.boolean().optional().default(false),
});

export const updateListingSchema = createListingSchema.partial();

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

// ── State machine ─────────────────────────────────────────────────────────────

type ListingStatus = 'draft' | 'published' | 'sold' | 'archived';

const ALLOWED_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ['published', 'archived'],
  published: ['sold', 'archived'],
  sold: [],
  archived: [], // archived → published is admin-only, handled separately
};

const ADMIN_ONLY_TRANSITIONS: Array<[ListingStatus, ListingStatus]> = [['archived', 'published']];

export function canTransition(from: ListingStatus, to: ListingStatus, isAdmin: boolean): boolean {
  // Check admin-only transitions
  for (const [f, t] of ADMIN_ONLY_TRANSITIONS) {
    if (f === from && t === to) {
      return isAdmin;
    }
  }
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Cache invalidation ────────────────────────────────────────────────────────

export async function invalidateListingCache(listingId: string): Promise<void> {
  const redis = getRedisClient();

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
    } else {
      await redis.del(pattern);
    }
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function createListing(sellerId: string, data: CreateListingInput) {
  const listing = await Listing.create({
    ...data,
    sellerId: new Types.ObjectId(sellerId),
    status: 'draft',
  });
  return listing;
}

export async function updateListing(
  listingId: string,
  sellerId: string,
  data: UpdateListingInput,
  isAdmin: boolean,
) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError('Listing not found', 404);

  if (!isAdmin && listing.sellerId.toString() !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  // Prevent direct status changes via update — use dedicated endpoints
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status: _status, ...safeUpdateData } = data as UpdateListingInput & { status?: string };

  Object.assign(listing, safeUpdateData);
  await listing.save();
  return listing;
}

export async function deleteListing(listingId: string, sellerId: string) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError('Listing not found', 404);

  if (listing.sellerId.toString() !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  // Delete image files from disk
  if (listing.images?.length) {
    const fs = await import('fs/promises');
    const path = await import('path');
    for (const img of listing.images) {
      const originalPath = path.resolve(
        __dirname,
        '../../../../uploads',
        img.original.replace('/uploads/', ''),
      );
      const thumbnailPath = path.resolve(
        __dirname,
        '../../../../uploads',
        img.thumbnail.replace('/uploads/', ''),
      );
      await fs.unlink(originalPath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});
    }
  }

  await Listing.findByIdAndDelete(listingId);
  await invalidateListingCache(listingId);
}

export async function getMyListings(sellerId: string) {
  return Listing.find({ sellerId: new Types.ObjectId(sellerId) }).sort({ createdAt: -1 });
}

export async function publishListing(listingId: string, sellerId: string) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError('Listing not found', 404);

  if (listing.sellerId.toString() !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  if (!canTransition(listing.status, 'published', false)) {
    throw new AppError(`Cannot transition from ${listing.status} to published`, 400);
  }

  listing.status = 'published';
  await listing.save();

  await enqueueAdminEmail('admin.listing.published', {
    listingId: listing._id.toString(),
    title: listing.title,
    sellerId: listing.sellerId.toString(),
  });
  await invalidateListingCache(listingId);
  return listing;
}

export async function markSold(listingId: string, sellerId: string) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError('Listing not found', 404);

  if (listing.sellerId.toString() !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  if (!canTransition(listing.status, 'sold', false)) {
    throw new AppError(`Cannot transition from ${listing.status} to sold`, 400);
  }

  listing.status = 'sold';
  await listing.save();

  await enqueueAdminEmail('admin.listing.sold', {
    listingId: listing._id.toString(),
    title: listing.title,
    sellerId: listing.sellerId.toString(),
  });

  await invalidateListingCache(listingId);
  return listing;
}

export async function getPublicFeed(page: number, limit: number) {
  const cacheKey = `feed:home:${page}`;
  return getOrSet(cacheKey, 300, async () => {
    const skip = (page - 1) * limit;

    const [featured, regular, total] = await Promise.all([
      Listing.find({ status: 'published', isFeatured: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Listing.find({ status: 'published', isFeatured: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Listing.countDocuments({ status: 'published' }),
    ]);

    // Merge featured first, then regular, deduplicate by id
    const seen = new Set<string>();
    const merged: typeof featured = [];
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

export async function getListingById(id: string) {
  return getOrSet(`listing:${id}`, 300, async () => {
    const listing = await Listing.findOne({ _id: id, status: 'published' });
    if (!listing) throw new AppError('Listing not found', 404);
    return listing;
  });
}
