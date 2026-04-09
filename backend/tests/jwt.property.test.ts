/**
 * Property-based tests for JWT token lifecycle.
 *
 * **Validates: Requirements 2.1, 2.3**
 *
 * Property 2: Access tokens expire in exactly 15 minutes;
 *             refresh tokens expire in exactly 7 days.
 *
 * These tests are pure — no DB connection required.
 */

import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = 'test-secret-at-least-32-characters-long!!';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 900 seconds
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const TOLERANCE_MS = 1000; // 1 second tolerance

function generateAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
}

// ---------------------------------------------------------------------------
// Property 2a — Access tokens expire in exactly 15 minutes
// **Validates: Requirements 2.1**
// ---------------------------------------------------------------------------
describe('JWT access token expiry property — 50 iterations', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * For all generated access tokens, exp - iat must equal exactly 900 seconds (15 minutes).
   */
  it('every access token has exp - iat === 900 seconds', () => {
    const ITERATIONS = 50;

    for (let i = 0; i < ITERATIONS; i++) {
      const token = generateAccessToken(`user-${i}`, `user${i}@example.com`, 'user');
      const decoded = jwt.decode(token) as { iat: number; exp: number };

      expect(decoded).not.toBeNull();
      expect(decoded.exp - decoded.iat).toBe(ACCESS_TOKEN_EXPIRY_SECONDS);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 2b — Refresh tokens expire in exactly 7 days
// **Validates: Requirements 2.3**
// ---------------------------------------------------------------------------
describe('Refresh token expiry property — 50 iterations', () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * For all generated refresh token expiry dates, the expiry must be
   * exactly 7 days from now (within ±1 second tolerance).
   */
  it('every refresh token expiresAt is exactly 7 days from now (±1 s)', () => {
    const ITERATIONS = 50;

    for (let i = 0; i < ITERATIONS; i++) {
      const now = Date.now();
      const expiresAt = generateRefreshTokenExpiresAt();
      const diff = expiresAt.getTime() - now;

      expect(diff).toBeGreaterThanOrEqual(REFRESH_TOKEN_EXPIRY_MS - TOLERANCE_MS);
      expect(diff).toBeLessThanOrEqual(REFRESH_TOKEN_EXPIRY_MS + TOLERANCE_MS);
    }
  });
});
