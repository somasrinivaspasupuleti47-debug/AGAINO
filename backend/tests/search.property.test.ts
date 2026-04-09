/**
 * Property-based tests for the Search Service.
 *
 * **Validates: Requirements 7.5**
 *
 * Property 6: Search results never contain listings with status Sold or Archived.
 *
 * These tests verify the MongoDB filter built by searchListings always
 * excludes sold/archived listings. We mock the Listing model to control
 * what the DB "returns" and assert the filter passed to find() is correct.
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
import { searchListings, SearchQuery } from '../src/modules/search/searchService';

const MockListing = Listing as jest.Mocked<typeof Listing>;

// Helper: build a chainable mock that resolves to []
function mockChain(result: unknown[] = []) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

// ── Property 6: status filter always excludes sold/archived ──────────────────

describe('searchListings — Property 6: never returns sold or archived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MockListing.find as jest.Mock).mockReturnValue(mockChain([]));
    (MockListing.countDocuments as jest.Mock).mockResolvedValue(0);
  });

  /**
   * **Validates: Requirements 7.5**
   *
   * For 50 random filter combinations, the MongoDB filter passed to
   * Listing.find() always contains { status: 'published' }.
   */
  it('property: all 50 random filter combinations include status:published filter', async () => {
    const categories = ['electronics', 'cars', 'furniture', 'clothing', undefined];
    const conditions: Array<'new' | 'used' | undefined> = ['new', 'used', undefined];
    const sorts: Array<SearchQuery['sort']> = ['newest', 'price_asc', 'price_desc', 'relevance', undefined];

    for (let i = 0; i < 50; i++) {
      jest.clearAllMocks();
      (MockListing.find as jest.Mock).mockReturnValue(mockChain([]));
      (MockListing.countDocuments as jest.Mock).mockResolvedValue(0);

      const query: SearchQuery = {
        q: i % 3 === 0 ? `search term ${i}` : undefined,
        category: categories[i % categories.length],
        condition: conditions[i % conditions.length],
        minPrice: i % 4 === 0 ? i * 10 : undefined,
        maxPrice: i % 4 === 0 ? i * 100 : undefined,
        sort: sorts[i % sorts.length],
        page: (i % 5) + 1,
        limit: 20,
      };

      await searchListings(query);

      // Listing.find is called twice (featured + regular)
      const calls = (MockListing.find as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);

      for (const [filter] of calls) {
        // Must always have status: 'published'
        expect(filter).toMatchObject({ status: 'published' });
        // Must never have status: 'sold' or 'archived'
        expect(filter.status).not.toBe('sold');
        expect(filter.status).not.toBe('archived');
      }
    }
  });

  it('filter with no params still excludes sold/archived', async () => {
    await searchListings({});

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter).toMatchObject({ status: 'published' });
    }
  });

  it('filter with q param still excludes sold/archived', async () => {
    await searchListings({ q: 'iphone' });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter).toMatchObject({ status: 'published' });
      expect(filter.$text).toEqual({ $search: 'iphone' });
    }
  });

  it('filter with geo params still excludes sold/archived', async () => {
    await searchListings({ lat: 36.737, lng: 3.042, radius: 5000 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter).toMatchObject({ status: 'published' });
      expect(filter['location.coordinates']).toBeDefined();
    }
  });

  it('filter with price range still excludes sold/archived', async () => {
    await searchListings({ minPrice: 100, maxPrice: 500 });

    const calls = (MockListing.find as jest.Mock).mock.calls;
    for (const [filter] of calls) {
      expect(filter).toMatchObject({ status: 'published' });
      expect(filter.price).toMatchObject({ $gte: 100, $lte: 500 });
    }
  });
});
