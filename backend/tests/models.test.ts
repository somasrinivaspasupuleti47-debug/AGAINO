import { Types } from 'mongoose';
import { User } from '../src/modules/auth/models/User';
import { Listing } from '../src/modules/listings/models/Listing';
import { Report } from '../src/modules/reports/models/Report';
import { WishlistEntry } from '../src/modules/wishlist/models/WishlistEntry';

const validSellerId = new Types.ObjectId();
const validUserId = new Types.ObjectId();
const validListingId = new Types.ObjectId();

// ─── User Schema ─────────────────────────────────────────────────────────────

describe('User schema', () => {
  it('requires email', () => {
    const user = new User({ displayName: 'Test', passwordHash: 'hash' });
    const err = user.validateSync();
    expect(err?.errors.email).toBeDefined();
  });

  it('requires displayName', () => {
    const user = new User({ email: 'a@b.com', passwordHash: 'hash' });
    const err = user.validateSync();
    expect(err?.errors.displayName).toBeDefined();
  });

  it('requires passwordHash', () => {
    const user = new User({ email: 'a@b.com', displayName: 'Test' });
    const err = user.validateSync();
    expect(err?.errors.passwordHash).toBeDefined();
  });

  it('defaults role to "user"', () => {
    const user = new User({ email: 'a@b.com', displayName: 'Test', passwordHash: 'hash' });
    expect(user.role).toBe('user');
  });

  it('defaults isVerified to false', () => {
    const user = new User({ email: 'a@b.com', displayName: 'Test', passwordHash: 'hash' });
    expect(user.isVerified).toBe(false);
  });

  it('defaults isBlocked to false', () => {
    const user = new User({ email: 'a@b.com', displayName: 'Test', passwordHash: 'hash' });
    expect(user.isBlocked).toBe(false);
  });

  it('rejects invalid role enum value', () => {
    const user = new User({
      email: 'a@b.com',
      displayName: 'Test',
      passwordHash: 'hash',
      role: 'superadmin' as any,
    });
    const err = user.validateSync();
    expect(err?.errors.role).toBeDefined();
  });

  it('accepts valid role "admin"', () => {
    const user = new User({
      email: 'a@b.com',
      displayName: 'Test',
      passwordHash: 'hash',
      role: 'admin',
    });
    const err = user.validateSync();
    expect(err?.errors.role).toBeUndefined();
  });
});

// ─── Listing Schema ───────────────────────────────────────────────────────────

const validListingBase = {
  sellerId: validSellerId,
  title: 'Test Listing',
  description: 'A valid description',
  price: 10,
  category: 'electronics',
  subcategory: 'phones',
  condition: 'used' as const,
  location: { city: 'Algiers', region: 'Algiers' },
};

describe('Listing schema', () => {
  it('requires sellerId', () => {
    const { sellerId, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.sellerId).toBeDefined();
  });

  it('requires title', () => {
    const { title, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.title).toBeDefined();
  });

  it('requires description', () => {
    const { description, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.description).toBeDefined();
  });

  it('requires price', () => {
    const { price, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.price).toBeDefined();
  });

  it('requires category', () => {
    const { category, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.category).toBeDefined();
  });

  it('requires subcategory', () => {
    const { subcategory, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.subcategory).toBeDefined();
  });

  it('requires condition', () => {
    const { condition, ...rest } = validListingBase;
    const listing = new Listing(rest);
    const err = listing.validateSync();
    expect(err?.errors.condition).toBeDefined();
  });

  it('requires location.city', () => {
    const listing = new Listing({
      ...validListingBase,
      location: { region: 'Algiers' },
    });
    const err = listing.validateSync();
    expect(err?.errors['location.city']).toBeDefined();
  });

  it('requires location.region', () => {
    const listing = new Listing({
      ...validListingBase,
      location: { city: 'Algiers' },
    });
    const err = listing.validateSync();
    expect(err?.errors['location.region']).toBeDefined();
  });

  it('enforces title maxlength of 100', () => {
    const listing = new Listing({
      ...validListingBase,
      title: 'a'.repeat(101),
    });
    const err = listing.validateSync();
    expect(err?.errors.title).toBeDefined();
  });

  it('accepts title at exactly 100 characters', () => {
    const listing = new Listing({
      ...validListingBase,
      title: 'a'.repeat(100),
    });
    const err = listing.validateSync();
    expect(err?.errors.title).toBeUndefined();
  });

  it('enforces description maxlength of 2000', () => {
    const listing = new Listing({
      ...validListingBase,
      description: 'a'.repeat(2001),
    });
    const err = listing.validateSync();
    expect(err?.errors.description).toBeDefined();
  });

  it('accepts description at exactly 2000 characters', () => {
    const listing = new Listing({
      ...validListingBase,
      description: 'a'.repeat(2000),
    });
    const err = listing.validateSync();
    expect(err?.errors.description).toBeUndefined();
  });

  it('rejects negative price', () => {
    const listing = new Listing({ ...validListingBase, price: -1 });
    const err = listing.validateSync();
    expect(err?.errors.price).toBeDefined();
  });

  it('accepts price of 0', () => {
    const listing = new Listing({ ...validListingBase, price: 0 });
    const err = listing.validateSync();
    expect(err?.errors.price).toBeUndefined();
  });

  it('rejects invalid condition enum value', () => {
    const listing = new Listing({ ...validListingBase, condition: 'refurbished' as any });
    const err = listing.validateSync();
    expect(err?.errors.condition).toBeDefined();
  });

  it('defaults status to "draft"', () => {
    const listing = new Listing(validListingBase);
    expect(listing.status).toBe('draft');
  });

  it('defaults isFeatured to false', () => {
    const listing = new Listing(validListingBase);
    expect(listing.isFeatured).toBe(false);
  });

  it('passes validation with all required fields', () => {
    const listing = new Listing(validListingBase);
    const err = listing.validateSync();
    expect(err).toBeUndefined();
  });
});

// ─── Report Schema ────────────────────────────────────────────────────────────

describe('Report schema', () => {
  const validReportBase = {
    listingId: validListingId,
    reporterId: validUserId,
    reason: 'spam' as const,
  };

  it('rejects invalid reason enum value', () => {
    const report = new Report({ ...validReportBase, reason: 'hate' as any });
    const err = report.validateSync();
    expect(err?.errors.reason).toBeDefined();
  });

  it('accepts all valid reason enum values', () => {
    const reasons = ['spam', 'fraud', 'inappropriate', 'duplicate', 'other'] as const;
    for (const reason of reasons) {
      const report = new Report({ ...validReportBase, reason });
      const err = report.validateSync();
      expect(err?.errors.reason).toBeUndefined();
    }
  });

  it('defaults status to "pending"', () => {
    const report = new Report(validReportBase);
    expect(report.status).toBe('pending');
  });

  it('rejects invalid status enum value', () => {
    const report = new Report({ ...validReportBase, status: 'open' as any });
    const err = report.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it('requires listingId', () => {
    const { listingId, ...rest } = validReportBase;
    const report = new Report(rest);
    const err = report.validateSync();
    expect(err?.errors.listingId).toBeDefined();
  });

  it('requires reporterId', () => {
    const { reporterId, ...rest } = validReportBase;
    const report = new Report(rest);
    const err = report.validateSync();
    expect(err?.errors.reporterId).toBeDefined();
  });

  it('requires reason', () => {
    const { reason, ...rest } = validReportBase;
    const report = new Report(rest);
    const err = report.validateSync();
    expect(err?.errors.reason).toBeDefined();
  });
});

// ─── WishlistEntry Schema ─────────────────────────────────────────────────────

describe('WishlistEntry schema', () => {
  it('requires userId', () => {
    const entry = new WishlistEntry({ listingId: validListingId });
    const err = entry.validateSync();
    expect(err?.errors.userId).toBeDefined();
  });

  it('requires listingId', () => {
    const entry = new WishlistEntry({ userId: validUserId });
    const err = entry.validateSync();
    expect(err?.errors.listingId).toBeDefined();
  });

  it('passes validation with both userId and listingId', () => {
    const entry = new WishlistEntry({ userId: validUserId, listingId: validListingId });
    const err = entry.validateSync();
    expect(err).toBeUndefined();
  });
});
