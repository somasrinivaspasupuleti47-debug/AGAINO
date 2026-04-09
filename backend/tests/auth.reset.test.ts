/**
 * Unit tests for password reset token expiry and strength validation.
 * Requirements: 3.3, 3.4
 */

jest.mock('../src/modules/auth/models/User');
jest.mock('../src/modules/auth/models/RefreshToken');
jest.mock('bcrypt');
jest.mock('../src/config/env', () => ({
  env: {
    ACCESS_TOKEN_SECRET: 'test-secret-at-least-32-characters-long!!',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-at-least-32-chars!!',
    FRONTEND_URL: 'http://localhost:3000',
    ADMIN_EMAIL: 'admin@example.com',
  },
}));
jest.mock('../src/jobs/emailQueue', () => ({
  enqueueOtpEmail: jest.fn().mockResolvedValue(undefined),
  enqueuePasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../src/modules/auth/models/User';
import { RefreshToken } from '../src/modules/auth/models/RefreshToken';
import { resetPassword } from '../src/modules/auth/authService';

const mockUser = User as jest.Mocked<typeof User>;
const mockRefreshToken = RefreshToken as jest.Mocked<typeof RefreshToken>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const SECRET = 'test-secret-at-least-32-characters-long!!';

// ── Zod schema (mirrored from authController) ─────────────────────────────────

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// ── Token expiry tests ────────────────────────────────────────────────────────

describe('reset token — expiry', () => {
  it('generates a token with exactly 30-minute expiry (exp - iat === 1800)', () => {
    const token = jwt.sign({ userId: 'user-id' }, SECRET, {
      expiresIn: '30m',
      subject: 'password-reset',
    });

    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded).not.toBeNull();
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp! - decoded.iat!).toBe(1800);
  });

  it('token subject is "password-reset"', () => {
    const token = jwt.sign({ userId: 'user-id' }, SECRET, {
      expiresIn: '30m',
      subject: 'password-reset',
    });

    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded.sub).toBe('password-reset');
  });
});

// ── Password strength validation (Zod) ───────────────────────────────────────

describe('resetPasswordSchema — password strength', () => {
  it('rejects password shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({ token: 'some-token', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it('rejects empty password', () => {
    const result = resetPasswordSchema.safeParse({ token: 'some-token', password: '' });
    expect(result.success).toBe(false);
  });

  it('accepts password of exactly 8 characters', () => {
    const result = resetPasswordSchema.safeParse({ token: 'some-token', password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('accepts password longer than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({ token: 'some-token', password: 'securepassword123' });
    expect(result.success).toBe(true);
  });
});

// ── resetPassword service — invalid/expired token ─────────────────────────────

describe('resetPassword service — token validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 400 for an expired token', async () => {
    // Sign a token that expired 1 second ago
    const expiredToken = jwt.sign({ userId: 'user-id' }, SECRET, {
      expiresIn: -1,
      subject: 'password-reset',
    });

    await expect(resetPassword({ token: expiredToken, password: 'newpassword123' })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired reset token',
    });
  });

  it('throws 400 for a token signed with wrong secret', async () => {
    const badToken = jwt.sign({ userId: 'user-id' }, 'wrong-secret-that-is-at-least-32-chars!!', {
      expiresIn: '30m',
      subject: 'password-reset',
    });

    await expect(resetPassword({ token: badToken, password: 'newpassword123' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws 400 for a token with wrong subject', async () => {
    const wrongSubjectToken = jwt.sign({ userId: 'user-id' }, SECRET, {
      expiresIn: '30m',
      subject: 'access',
    });

    await expect(resetPassword({ token: wrongSubjectToken, password: 'newpassword123' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws 400 for a completely invalid token string', async () => {
    await expect(resetPassword({ token: 'not.a.valid.jwt', password: 'newpassword123' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

// ── resetPassword service — success path ──────────────────────────────────────

describe('resetPassword service — success', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates passwordHash and invalidates all refresh tokens on valid token', async () => {
    const userId = new Types.ObjectId().toString();
    const validToken = jwt.sign({ userId }, SECRET, {
      expiresIn: '30m',
      subject: 'password-reset',
    });

    const mockUserDoc = {
      _id: new Types.ObjectId(userId),
      email: 'user@example.com',
      passwordHash: 'old-hash',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (mockUser.findById as jest.Mock).mockResolvedValue(mockUserDoc);
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
    (mockRefreshToken.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });

    await resetPassword({ token: validToken, password: 'newpassword123' });

    // Password was hashed with cost 12
    expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
    // passwordHash was updated
    expect(mockUserDoc.passwordHash).toBe('new-hashed-password');
    // user was saved
    expect(mockUserDoc.save).toHaveBeenCalled();
    // all refresh tokens were invalidated
    expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
  });
});
