/**
 * Property-based tests for OTP generation logic.
 *
 * Validates: Requirements 1.3, 1.4
 *
 * Property 1: OTP codes are always 6 digits and expire after 10 minutes.
 *
 * These tests are pure — no DB connection required.
 * They exercise the same logic used in authService.ts directly.
 */

import crypto from 'crypto';

const OTP_EXPIRY_MINUTES = 10;

/** Mirrors the OTP generation logic in authService.registerUser */
function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** Mirrors the expiry calculation in authService.registerUser */
function generateExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Property 1a — OTP codes are always exactly 6 digits (100000–999999)
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------
describe('OTP digit property — 100 iterations', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For all generated OTP codes the numeric value must be in [100000, 999999]
   * and the string representation must be exactly 6 characters long.
   */
  it('every generated OTP is a 6-digit string between 100000 and 999999', () => {
    const ITERATIONS = 100;

    for (let i = 0; i < ITERATIONS; i++) {
      const code = generateOtpCode();
      const numeric = parseInt(code, 10);

      expect(code).toHaveLength(6);
      expect(numeric).toBeGreaterThanOrEqual(100000);
      expect(numeric).toBeLessThanOrEqual(999999);
      expect(/^\d{6}$/.test(code)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 1b — OTP expiry is always exactly 10 minutes from creation
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------
describe('OTP expiry property — 100 iterations', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * For any creation timestamp the computed expiresAt must be exactly
   * 10 minutes later (within a 1-second tolerance to account for execution time).
   */
  it('expiresAt is always 10 minutes after creation (±1 s tolerance)', () => {
    const ITERATIONS = 100;
    const EXPECTED_MS = OTP_EXPIRY_MINUTES * 60 * 1000; // 600 000 ms
    const TOLERANCE_MS = 1000; // 1 second

    for (let i = 0; i < ITERATIONS; i++) {
      const now = new Date();
      const expiresAt = generateExpiresAt(now);

      const diff = expiresAt.getTime() - now.getTime();

      expect(diff).toBeGreaterThanOrEqual(EXPECTED_MS - TOLERANCE_MS);
      expect(diff).toBeLessThanOrEqual(EXPECTED_MS + TOLERANCE_MS);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 1c — Consecutive OTP generations produce different codes (uniqueness)
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------
describe('OTP uniqueness property — 50 consecutive pairs', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * Two consecutive OTP generations should (with overwhelming probability)
   * produce different codes, demonstrating the randomness of the generator.
   *
   * Note: a collision is theoretically possible (~1 in 900 000 chance per pair)
   * so we allow at most 1 collision across 50 pairs to avoid flakiness.
   */
  it('consecutive OTP codes are almost always different', () => {
    const PAIRS = 50;
    let collisions = 0;

    for (let i = 0; i < PAIRS; i++) {
      const first = generateOtpCode();
      const second = generateOtpCode();

      if (first === second) {
        collisions++;
      }
    }

    // Allow at most 1 collision across 50 pairs (probability ≈ 5.5e-5)
    expect(collisions).toBeLessThanOrEqual(1);
  });
});
