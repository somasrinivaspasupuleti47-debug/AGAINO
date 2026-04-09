/**
 * Property-based tests for the Redis caching layer.
 *
 * **Validates: Requirements 16.2**
 *
 * Property 5: After any listing write (invalidateListingCache), no stale
 *             feed:* or search:* cache entry for that listing remains in Redis.
 *
 * These tests use a mock Redis client — no real Redis connection required.
 */

// ── Mock Redis ────────────────────────────────────────────────────────────────

const mockStore: Map<string, string> = new Map();

const mockRedis = {
  get: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  set: jest.fn(async (key: string, value: string, _ex: string, _ttl: number) => {
    mockStore.set(key, value);
    return 'OK';
  }),
  del: jest.fn(async (...keys: string[]) => {
    for (const k of keys) mockStore.delete(k);
    return keys.length;
  }),
  scan: jest.fn(async (_cursor: string, _match: string, pattern: string, _count: string, _n: number) => {
    const matchingKeys = [...mockStore.keys()].filter((k) => {
      // Convert Redis glob pattern to regex
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(k);
    });
    return ['0', matchingKeys];
  }),
};

jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { invalidateListingCache } from '../src/modules/listings/listingService';
import { getOrSet } from '../src/utils/cache';

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedCache(keys: string[], value: unknown = { data: 'stale' }) {
  for (const k of keys) {
    mockStore.set(k, JSON.stringify(value));
  }
}

function allKeys(): string[] {
  return [...mockStore.keys()];
}

// ── Property 5: After invalidateListingCache, no stale feed/search keys remain ─

describe('invalidateListingCache — Property 5', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
    // Re-wire scan mock after clearAllMocks
    mockRedis.scan.mockImplementation(async (_cursor: string, _match: string, pattern: string) => {
      const matchingKeys = [...mockStore.keys()].filter((k) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(k);
      });
      return ['0', matchingKeys];
    });
    mockRedis.del.mockImplementation(async (...keys: string[]) => {
      for (const k of keys) mockStore.delete(k);
      return keys.length;
    });
    mockRedis.get.mockImplementation(async (key: string) => mockStore.get(key) ?? null);
    mockRedis.set.mockImplementation(async (key: string, value: string) => {
      mockStore.set(key, value);
      return 'OK';
    });
  });

  it('removes the specific listing:{id} key', async () => {
    const listingId = 'abc123';
    seedCache([`listing:${listingId}`]);

    await invalidateListingCache(listingId);

    expect(mockStore.has(`listing:${listingId}`)).toBe(false);
  });

  it('removes all feed:* keys after invalidation', async () => {
    const listingId = 'abc123';
    seedCache(['feed:home:1', 'feed:home:2', 'feed:category:electronics:1']);

    await invalidateListingCache(listingId);

    const remaining = allKeys().filter((k) => k.startsWith('feed:'));
    expect(remaining).toHaveLength(0);
  });

  it('removes all search:* keys after invalidation', async () => {
    const listingId = 'abc123';
    seedCache(['search:aabbcc', 'search:ddeeff', 'search:112233']);

    await invalidateListingCache(listingId);

    const remaining = allKeys().filter((k) => k.startsWith('search:'));
    expect(remaining).toHaveLength(0);
  });

  it('removes feed:*, search:*, and listing:{id} simultaneously', async () => {
    const listingId = 'listing-xyz';
    seedCache([
      'feed:home:1',
      'feed:home:2',
      'feed:category:cars:1',
      'search:hash1',
      'search:hash2',
      `listing:${listingId}`,
      'unrelated:key', // should NOT be removed
    ]);

    await invalidateListingCache(listingId);

    expect(mockStore.has('feed:home:1')).toBe(false);
    expect(mockStore.has('feed:home:2')).toBe(false);
    expect(mockStore.has('feed:category:cars:1')).toBe(false);
    expect(mockStore.has('search:hash1')).toBe(false);
    expect(mockStore.has('search:hash2')).toBe(false);
    expect(mockStore.has(`listing:${listingId}`)).toBe(false);
    // Unrelated key must survive
    expect(mockStore.has('unrelated:key')).toBe(true);
  });

  it('is idempotent — calling twice leaves no feed/search keys', async () => {
    const listingId = 'idem-test';
    seedCache(['feed:home:1', 'search:abc', `listing:${listingId}`]);

    await invalidateListingCache(listingId);
    await invalidateListingCache(listingId);

    const remaining = allKeys().filter(
      (k) => k.startsWith('feed:') || k.startsWith('search:') || k === `listing:${listingId}`,
    );
    expect(remaining).toHaveLength(0);
  });

  /**
   * **Validates: Requirements 16.2**
   *
   * Exhaustive property: for 50 random listing IDs, after invalidation,
   * no feed:* or search:* key remains.
   */
  it('property: for any listing ID, no feed/search keys survive invalidation', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `listing-id-${i}`);

    for (const id of ids) {
      mockStore.clear();
      seedCache([
        `feed:home:1`,
        `feed:home:2`,
        `feed:category:test:1`,
        `search:hash-${id}`,
        `listing:${id}`,
      ]);

      await invalidateListingCache(id);

      const stale = allKeys().filter(
        (k) => k.startsWith('feed:') || k.startsWith('search:') || k === `listing:${id}`,
      );
      expect(stale).toHaveLength(0);
    }
  });
});

// ── getOrSet — cache-aside behaviour ─────────────────────────────────────────

describe('getOrSet — cache-aside helper', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
    mockRedis.get.mockImplementation(async (key: string) => mockStore.get(key) ?? null);
    mockRedis.set.mockImplementation(async (key: string, value: string) => {
      mockStore.set(key, value);
      return 'OK';
    });
  });

  it('calls fetchFn on cache miss and stores the result', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ hello: 'world' });

    const result = await getOrSet('test:key', 300, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ hello: 'world' });
    expect(mockStore.has('test:key')).toBe(true);
  });

  it('returns cached value on second call without calling fetchFn again', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ hello: 'world' });

    await getOrSet('test:key2', 300, fetchFn);
    const result = await getOrSet('test:key2', 300, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1); // only called once
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns fresh value after cache is cleared', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ v: 1 });

    await getOrSet('test:key3', 300, fetchFn);
    mockStore.delete('test:key3');

    const fetchFn2 = jest.fn().mockResolvedValue({ v: 2 });
    const result = await getOrSet('test:key3', 300, fetchFn2);

    expect(fetchFn2).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ v: 2 });
  });

  it('property: getOrSet never calls fetchFn more than once per unique key when cache is warm', async () => {
    const keys = Array.from({ length: 20 }, (_, i) => `key:${i}`);

    for (const key of keys) {
      const fetchFn = jest.fn().mockResolvedValue({ key });
      // First call — miss
      await getOrSet(key, 60, fetchFn);
      // Second call — hit
      await getOrSet(key, 60, fetchFn);
      // Third call — hit
      await getOrSet(key, 60, fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
  });
});
