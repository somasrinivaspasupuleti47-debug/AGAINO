/**
 * Property-based tests for listing status transitions.
 *
 * **Validates: Requirements 6.1**
 *
 * Property 4: No listing can transition to a status not defined in the
 *             allowed state machine.
 *
 * These tests are pure — no DB connection required.
 * They exercise the canTransition helper directly.
 */

import { canTransition } from '../src/modules/listings/listingService';

type ListingStatus = 'draft' | 'published' | 'sold' | 'archived';

const ALL_STATUSES: ListingStatus[] = ['draft', 'published', 'sold', 'archived'];

// ── Allowed transitions (source of truth) ────────────────────────────────────

const ALLOWED_NON_ADMIN: Array<[ListingStatus, ListingStatus]> = [
  ['draft', 'published'],
  ['draft', 'archived'],
  ['published', 'sold'],
  ['published', 'archived'],
];

const ALLOWED_ADMIN_ONLY: Array<[ListingStatus, ListingStatus]> = [
  ['archived', 'published'],
];

const ALL_ALLOWED_ADMIN: Array<[ListingStatus, ListingStatus]> = [
  ...ALLOWED_NON_ADMIN,
  ...ALLOWED_ADMIN_ONLY,
];

function isAllowed(from: ListingStatus, to: ListingStatus, isAdmin: boolean): boolean {
  if (isAdmin) {
    return ALL_ALLOWED_ADMIN.some(([f, t]) => f === from && t === to);
  }
  return ALLOWED_NON_ADMIN.some(([f, t]) => f === from && t === to);
}

// ── Property 4: No invalid transition returns true ────────────────────────────

describe('canTransition — state machine correctness (non-admin)', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For every (from, to) pair NOT in the allowed set, canTransition must
   * return false for a non-admin user.
   */
  it('every disallowed transition returns false for non-admin', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = isAllowed(from, to, false);
        const actual = canTransition(from, to, false);
        expect(actual).toBe(expected);
      }
    }
  });

  it('every allowed non-admin transition returns true', () => {
    for (const [from, to] of ALLOWED_NON_ADMIN) {
      expect(canTransition(from, to, false)).toBe(true);
    }
  });

  it('admin-only transitions return false for non-admin', () => {
    for (const [from, to] of ALLOWED_ADMIN_ONLY) {
      expect(canTransition(from, to, false)).toBe(false);
    }
  });
});

describe('canTransition — state machine correctness (admin)', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For every (from, to) pair NOT in the allowed set (including admin-only),
   * canTransition must return false even for admin.
   */
  it('every disallowed transition returns false for admin', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = isAllowed(from, to, true);
        const actual = canTransition(from, to, true);
        expect(actual).toBe(expected);
      }
    }
  });

  it('admin-only transitions return true for admin', () => {
    for (const [from, to] of ALLOWED_ADMIN_ONLY) {
      expect(canTransition(from, to, true)).toBe(true);
    }
  });

  it('all allowed transitions (including admin-only) return true for admin', () => {
    for (const [from, to] of ALL_ALLOWED_ADMIN) {
      expect(canTransition(from, to, true)).toBe(true);
    }
  });
});

describe('canTransition — exhaustive pair coverage', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * Exhaustively verify all 16 (from, to) pairs × 2 (isAdmin) = 32 combinations.
   * No combination should produce an unexpected result.
   */
  it('all 32 combinations match the expected state machine', () => {
    let testedCount = 0;
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        for (const isAdmin of [false, true]) {
          const expected = isAllowed(from, to, isAdmin);
          const actual = canTransition(from, to, isAdmin);
          expect(actual).toBe(expected);
          testedCount++;
        }
      }
    }
    expect(testedCount).toBe(32);
  });

  it('sold status has no valid outgoing transitions for anyone', () => {
    for (const to of ALL_STATUSES) {
      expect(canTransition('sold', to, false)).toBe(false);
      expect(canTransition('sold', to, true)).toBe(false);
    }
  });

  it('draft cannot transition to sold or stay as draft', () => {
    expect(canTransition('draft', 'sold', false)).toBe(false);
    expect(canTransition('draft', 'sold', true)).toBe(false);
    expect(canTransition('draft', 'draft', false)).toBe(false);
    expect(canTransition('draft', 'draft', true)).toBe(false);
  });

  it('published cannot transition to draft', () => {
    expect(canTransition('published', 'draft', false)).toBe(false);
    expect(canTransition('published', 'draft', true)).toBe(false);
  });
});
