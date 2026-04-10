import { z } from 'zod';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { enqueueAdminEmail } from '../../jobs/emailQueue';

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

// ── Service functions ─────────────────────────────────────────────────────────

export async function createListing(sellerId: string, data: CreateListingInput) {
  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      ...data,
      seller_id: sellerId,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 500);
  return listing;
}

export async function updateListing(
  listingId: string,
  sellerId: string,
  data: UpdateListingInput,
  isAdmin: boolean,
) {
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (fetchError || !listing) throw new AppError('Listing not found', 404);

  if (!isAdmin && listing.seller_id !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  // Prevent direct status changes via update
  const { status: _status, ...safeUpdateData } = data as UpdateListingInput & { status?: string };

  const { data: updated, error: updateError } = await supabase
    .from('listings')
    .update(safeUpdateData)
    .eq('id', listingId)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500);
  return updated;
}

export async function deleteListing(listingId: string, sellerId: string) {
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (fetchError || !listing) throw new AppError('Listing not found', 404);

  if (listing.seller_id !== sellerId) {
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

  await supabase.from('listings').delete().eq('id', listingId);
}

export async function getMyListings(sellerId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 500);
  return data;
}

export async function publishListing(listingId: string, sellerId: string) {
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (fetchError || !listing) throw new AppError('Listing not found', 404);

  if (listing.seller_id !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  if (!canTransition(listing.status, 'published', false)) {
    throw new AppError(`Cannot transition from ${listing.status} to published`, 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from('listings')
    .update({ status: 'published' })
    .eq('id', listingId)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500);

  await enqueueAdminEmail('admin.listing.published', {
    listingId: updated.id,
    title: updated.title,
    sellerId: updated.seller_id,
  });

  return updated;
}

export async function markSold(listingId: string, sellerId: string) {
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (fetchError || !listing) throw new AppError('Listing not found', 404);

  if (listing.seller_id !== sellerId) {
    throw new AppError('Forbidden', 403);
  }

  if (!canTransition(listing.status, 'sold', false)) {
    throw new AppError(`Cannot transition from ${listing.status} to sold`, 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listingId)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500);

  await enqueueAdminEmail('admin.listing.sold', {
    listingId: updated.id,
    title: updated.title,
    sellerId: updated.seller_id,
  });

  return updated;
}

export async function getPublicFeed(page: number, limit: number) {
  const offset = (page - 1) * limit;

  // Supabase doesn't easily support the dual-sort merge in one query without complex logic
  // We'll fetch published listings ordered by featured DESC then created_at DESC
  const {
    data: listings,
    error,
    count,
  } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(error.message, 500);

  return {
    listings,
    total: count || 0,
    page,
    limit,
    pages: Math.ceil((count || 0) / limit),
  };
}

export async function getListingById(id: string) {
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !listing) throw new AppError('Listing not found', 404);
  return listing;
}
