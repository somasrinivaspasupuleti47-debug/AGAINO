import crypto from 'crypto';
import { FilterQuery } from 'mongoose';
import { Listing, IListing } from '../listings/models/Listing';
import { SearchSuggestion } from './SearchSuggestion';
import { getOrSet } from '../../utils/cache';
import { getRedisClient } from '../../config/redis';

export interface SearchQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  condition?: 'new' | 'used';
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radius?: number; // metres
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'relevance';
  page?: number;
  limit?: number;
}

function hashParams(params: SearchQuery): string {
  return crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex');
}

export async function searchListings(query: SearchQuery) {
  const {
    q,
    category,
    subcategory,
    condition,
    minPrice,
    maxPrice,
    lat,
    lng,
    radius,
    sort = 'newest',
    page = 1,
    limit = 20,
  } = query;

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const cacheKey = `search:${hashParams(query)}`;

  return getOrSet(cacheKey, 300, async () => {
    // ── Build filter ──────────────────────────────────────────────────────────
    const filter: FilterQuery<IListing> = {
      status: 'published',
    };

    if (q) {
      filter.$text = { $search: q };
    }

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (condition) filter.condition = condition;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
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

    // ── Sort ──────────────────────────────────────────────────────────────────
    type SortSpec = Record<string, 1 | -1 | { $meta: string }>;
    let sortSpec: SortSpec;
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
      Listing.find({ ...filter, isFeatured: true })
        .sort(sortSpec)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Listing.find({ ...filter, isFeatured: false })
        .sort(sortSpec)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    // Deduplicate and merge featured first
    const seen = new Set<string>();
    const merged: typeof featured = [];
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

export async function autocomplete(q: string) {
  const cacheKey = `autocomplete:${q.toLowerCase().trim()}`;
  const redis = getRedisClient();

  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached) as string[];
  }

  const suggestions = await SearchSuggestion.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .lean();

  const results = suggestions.map((s) => s.text);
  await redis.set(cacheKey, JSON.stringify(results), 'EX', 60);
  return results;
}
