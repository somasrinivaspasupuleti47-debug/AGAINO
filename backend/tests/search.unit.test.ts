/**
 * Unit tests for Search Service — filter combinations and pagination.
 *
 * Tests:
 *  - Filter combinations: price range, category, condition, geo
 *  - Pagination boundary conditions
 *  - Sort options
 *
 * _Requirements: 7.3, 7.6_
 */

// ── Mock Redis ────────────────────────────────────────────────────────────────

jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null), // always cache miss
    set: jest.fn().mockResolvedValue('OK'),
  })),
}));

// ── Mock Listing model ────────────────────────────────────────────────────────

jest.mock('../src/modules/listings/models/Listing');

import { Listing } from '../src/modules/listings/models/Listing';
import { searchListings } from '../src/modules/search/searchService';

const MockListing = Listing as jest.Mocked<typeof Listing>;

function mockChain(result: unknown[] = []) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  (MockListing.find as jest.Mock).mockReturnValue(mockChain([]));
  (MockListing.countDocuments as jest.Mock).mockResolvedValue(0);
});

// ── Filter combinations ───────────────────────────────────────────────────────

describe('searchListings — filter combinations', () => {
  it('builds $text filter when q is provided', async () => {
    await searchListings({ q: 'laptop' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.$text).toEqual({ $search: 'laptop' });
    }
  });

  it('does not include $text filter when q is absent', async () => {
    await searchListings({ category: 'electronics' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.$text).toBeUndefined();
    }
  });

  it('applies category filter', async () => {
    await searchListings({ category: 'cars' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.category).toBe('cars');
    }
  });

  it('applies subcategory filter', async () => {
    await searchListings({ subcategory: 'sedans' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.subcategory).toBe('sedans');
    }
  });

  it('applies condition filter for "new"', async () => {
    await searchListings({ condition: 'new' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.condition).toBe('new');
    }
  });

  it('applies condition filter for "used"', async () => {
    await searchListings({ condition: 'used' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.condition).toBe('used');
    }
  });

  it('applies minPrice filter', async () => {
    await searchListings({ minPrice: 100 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.price.$gte).toBe(100);
    }
  });

  it('applies maxPrice filter', async () => {
    await searchListings({ maxPrice: 500 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.price.$lte).toBe(500);
    }
  });

  it('applies both minPrice and maxPrice', async () => {
    await searchListings({ minPrice: 50, maxPrice: 200 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.price).toMatchObject({ $gte: 50, $lte: 200 });
    }
  });

  it('applies geo filter when lat/lng/radius provided', async () => {
    await searchListings({ lat: 36.737, lng: 3.042, radius: 10000 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter['location.coordinates']).toBeDefined();
      expect(filter['location.coordinates'].$geoWithin).toBeDefined();
      expect(filter['location.coordinates'].$geoWithin.$centerSphere).toBeDefined();
    }
  });

  it('does not apply geo filter when only lat is provided (missing lng/radius)', async () => {
    await searchListings({ lat: 36.737 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter['location.coordinates']).toBeUndefined();
    }
  });

  it('combines multiple filters correctly', async () => {
    await searchListings({
      q: 'phone',
      category: 'electronics',
      condition: 'used',
      minPrice: 50,
      maxPrice: 300,
    });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter.status).toBe('published');
      expect(filter.$text).toEqual({ $search: 'phone' });
      expect(filter.category).toBe('electronics');
      expect(filter.condition).toBe('used');
      expect(filter.price).toMatchObject({ $gte: 50, $lte: 300 });
    }
  });
});

// ── Sort options ──────────────────────────────────────────────────────────────

describe('searchListings — sort options', () => {
  it('sorts by createdAt desc for "newest"', async () => {
    await searchListings({ sort: 'newest' });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('sorts by price asc for "price_asc"', async () => {
    await searchListings({ sort: 'price_asc' });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ price: 1 });
  });

  it('sorts by price desc for "price_desc"', async () => {
    await searchListings({ sort: 'price_desc' });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ price: -1 });
  });

  it('sorts by textScore for "relevance" when q is provided', async () => {
    await searchListings({ sort: 'relevance', q: 'laptop' });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({
      score: { $meta: 'textScore' },
      createdAt: -1,
    });
  });

  it('falls back to createdAt desc for "relevance" without q', async () => {
    await searchListings({ sort: 'relevance' });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('defaults to newest sort when sort is not provided', async () => {
    await searchListings({});

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});

// ── Pagination boundary conditions ────────────────────────────────────────────

describe('searchListings — pagination boundaries', () => {
  it('page=1 limit=20 uses skip=0 limit=20', async () => {
    await searchListings({ page: 1, limit: 20 });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it('page=2 limit=20 uses skip=20', async () => {
    await searchListings({ page: 2, limit: 20 });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.skip).toHaveBeenCalledWith(20);
  });

  it('page=0 defaults to page=1 (skip=0)', async () => {
    await searchListings({ page: 0, limit: 20 });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.skip).toHaveBeenCalledWith(0);
  });

  it('negative page defaults to page=1', async () => {
    await searchListings({ page: -5, limit: 20 });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.skip).toHaveBeenCalledWith(0);
  });

  it('limit=200 is capped to 100', async () => {
    await searchListings({ page: 1, limit: 200 });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.limit).toHaveBeenCalledWith(100);
  });

  it('limit=0 defaults to 1', async () => {
    await searchListings({ page: 1, limit: 0 });

    const chain = (MockListing.find as jest.Mock).mock.results[0].value;
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('returns correct pagination metadata', async () => {
    (MockListing.countDocuments as jest.Mock).mockResolvedValue(45);

    const result = await searchListings({ page: 1, limit: 20 });

    expect(result.total).toBe(45);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.pages).toBe(3); // ceil(45/20)
  });

  it('featured listings are prepended before regular listings', async () => {
    const featuredListing = { _id: 'feat-1', isFeatured: true, title: 'Featured' };
    const regularListing = { _id: 'reg-1', isFeatured: false, title: 'Regular' };

    // First call (featured), second call (regular)
    (MockListing.find as jest.Mock)
      .mockReturnValueOnce(mockChain([featuredListing]))
      .mockReturnValueOnce(mockChain([regularListing]));
    (MockListing.countDocuments as jest.Mock).mockResolvedValue(2);

    const result = await searchListings({ page: 1, limit: 20 });

    expect(result.listings[0]).toMatchObject({ _id: 'feat-1' });
    expect(result.listings[1]).toMatchObject({ _id: 'reg-1' });
  });
});
