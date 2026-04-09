/**
 * Unit tests for Listing CRUD authorization and field validation.
 *
 * Tests:
 *  - Owner vs non-owner 403 on update and delete
 *  - Zod field validation (title, description, price, condition, location)
 *  - Status transition guards (publish, markSold)
 *
 * _Requirements: 5.2, 5.7_
 */

import { createListingSchema, updateListingSchema, canTransition } from '../src/modules/listings/listingService';

describe('createListingSchema — field validation', () => {
  const validBase = {
    title: 'Test Listing',
    description: 'A great item for sale',
    price: 100,
    category: 'electronics',
    subcategory: 'phones',
    condition: 'used' as const,
    location: { city: 'Algiers', region: 'Algiers' },
  };

  it('accepts a valid listing payload', () => {
    const result = createListingSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects title longer than 100 characters', () => {
    const result = createListingSchema.safeParse({ ...validBase, title: 'a'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it('rejects empty title', () => {
    const result = createListingSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 2000 characters', () => {
    const result = createListingSchema.safeParse({ ...validBase, description: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.description).toBeDefined();
    }
  });

  it('rejects negative price', () => {
    const result = createListingSchema.safeParse({ ...validBase, price: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.price).toBeDefined();
    }
  });

  it('accepts price of 0 (free item)', () => {
    const result = createListingSchema.safeParse({ ...validBase, price: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid condition value', () => {
    const result = createListingSchema.safeParse({ ...validBase, condition: 'broken' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.condition).toBeDefined();
    }
  });

  it('accepts condition "new"', () => {
    const result = createListingSchema.safeParse({ ...validBase, condition: 'new' });
    expect(result.success).toBe(true);
  });

  it('rejects missing location.city', () => {
    const result = createListingSchema.safeParse({
      ...validBase,
      location: { region: 'Algiers' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing location.region', () => {
    const result = createListingSchema.safeParse({
      ...validBase,
      location: { city: 'Algiers' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = createListingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional coordinates when provided correctly', () => {
    const result = createListingSchema.safeParse({
      ...validBase,
      location: {
        city: 'Algiers',
        region: 'Algiers',
        coordinates: { type: 'Point', coordinates: [3.042, 36.737] },
      },
    });
    expect(result.success).toBe(true);
  });

  it('defaults isFeatured to false when not provided', () => {
    const result = createListingSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFeatured).toBe(false);
    }
  });

  it('defaults images to empty array when not provided', () => {
    const result = createListingSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toEqual([]);
    }
  });
});

describe('updateListingSchema — partial validation', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateListingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with only title', () => {
    const result = updateListingSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('rejects title longer than 100 chars in partial update', () => {
    const result = updateListingSchema.safeParse({ title: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects negative price in partial update', () => {
    const result = updateListingSchema.safeParse({ price: -5 });
    expect(result.success).toBe(false);
  });
});

// ── canTransition — authorization logic ──────────────────────────────────────

describe('canTransition — owner transitions', () => {
  it('draft → published is allowed for owner', () => {
    expect(canTransition('draft', 'published', false)).toBe(true);
  });

  it('published → sold is allowed for owner', () => {
    expect(canTransition('published', 'sold', false)).toBe(true);
  });

  it('published → archived is allowed for owner', () => {
    expect(canTransition('published', 'archived', false)).toBe(true);
  });

  it('draft → archived is allowed for owner (soft delete)', () => {
    expect(canTransition('draft', 'archived', false)).toBe(true);
  });

  it('archived → published is NOT allowed for owner', () => {
    expect(canTransition('archived', 'published', false)).toBe(false);
  });

  it('sold → any status is NOT allowed for owner', () => {
    expect(canTransition('sold', 'draft', false)).toBe(false);
    expect(canTransition('sold', 'published', false)).toBe(false);
    expect(canTransition('sold', 'archived', false)).toBe(false);
  });
});

describe('canTransition — admin transitions', () => {
  it('archived → published is allowed for admin', () => {
    expect(canTransition('archived', 'published', true)).toBe(true);
  });

  it('sold → any status is NOT allowed even for admin', () => {
    expect(canTransition('sold', 'draft', true)).toBe(false);
    expect(canTransition('sold', 'published', true)).toBe(false);
    expect(canTransition('sold', 'archived', true)).toBe(false);
  });
});

// ── Authorization: owner vs non-owner ────────────────────────────────────────
// These tests verify the service throws 403 for non-owners.
// We test the logic by mocking Listing.findById.

// Mock the Listing model at module level
jest.mock('../src/modules/listings/models/Listing');
// Mock Redis to avoid real connections
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    scan: jest.fn().mockResolvedValue(['0', []]),
    del: jest.fn().mockResolvedValue(0),
  })),
}));
// Mock emailQueue to avoid real BullMQ connections
jest.mock('../src/jobs/emailQueue', () => ({
  enqueueAdminEmail: jest.fn().mockResolvedValue(undefined),
}));

import { Listing } from '../src/modules/listings/models/Listing';
import {
  updateListing,
  deleteListing,
  publishListing,
  markSold,
} from '../src/modules/listings/listingService';

const MockListing = Listing as jest.Mocked<typeof Listing>;

describe('updateListing — owner authorization', () => {
  it('throws 403 when non-owner tries to update', async () => {
    (MockListing.findById as jest.Mock).mockResolvedValue({
      _id: 'listing123',
      sellerId: { toString: () => 'owner-user-id' },
      status: 'draft',
      save: jest.fn(),
    });

    await expect(
      updateListing('listing123', 'different-user-id', { title: 'New' }, false),
    ).rejects.toMatchObject({ statusCode: 403, message: 'Forbidden' });
  });

  it('throws 403 when non-owner tries to delete', async () => {
    (MockListing.findById as jest.Mock).mockResolvedValue({
      _id: 'listing123',
      sellerId: { toString: () => 'owner-user-id' },
      status: 'draft',
      save: jest.fn(),
    });

    await expect(
      deleteListing('listing123', 'different-user-id'),
    ).rejects.toMatchObject({ statusCode: 403, message: 'Forbidden' });
  });

  it('throws 403 when non-owner tries to publish', async () => {
    (MockListing.findById as jest.Mock).mockResolvedValue({
      _id: 'listing123',
      sellerId: { toString: () => 'owner-user-id' },
      status: 'draft',
      save: jest.fn(),
    });

    await expect(
      publishListing('listing123', 'different-user-id'),
    ).rejects.toMatchObject({ statusCode: 403, message: 'Forbidden' });
  });

  it('throws 403 when non-owner tries to mark sold', async () => {
    (MockListing.findById as jest.Mock).mockResolvedValue({
      _id: 'listing123',
      sellerId: { toString: () => 'owner-user-id' },
      status: 'published',
      save: jest.fn(),
    });

    await expect(
      markSold('listing123', 'different-user-id'),
    ).rejects.toMatchObject({ statusCode: 403, message: 'Forbidden' });
  });
});

describe('publishListing — invalid transition', () => {
  it('throws 400 when trying to publish an already-published listing', async () => {
    (MockListing.findById as jest.Mock).mockResolvedValue({
      _id: 'listing123',
      sellerId: { toString: () => 'owner-user-id' },
      status: 'published',
      save: jest.fn(),
    });

    await expect(
      publishListing('listing123', 'owner-user-id'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when trying to mark a draft listing as sold', async () => {
    (MockListing.findById as jest.Mock).mockResolvedValue({
      _id: 'listing123',
      sellerId: { toString: () => 'owner-user-id' },
      status: 'draft',
      save: jest.fn(),
    });

    await expect(
      markSold('listing123', 'owner-user-id'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
