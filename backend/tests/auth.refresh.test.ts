/**
 * Unit tests for refresh token rotation and logout invalidation.
 * Requirements: 2.3, 2.4, 2.5
 */

jest.mock('../src/modules/auth/models/User');
jest.mock('../src/modules/auth/models/RefreshToken');
jest.mock('bcrypt');
jest.mock('../src/config/env', () => ({
  env: {
    ACCESS_TOKEN_SECRET: 'test-secret-at-least-32-characters-long!!',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-at-least-32-chars!!',
    ADMIN_EMAIL: 'admin@example.com',
  },
}));
jest.mock('../src/jobs/emailQueue', () => ({
  enqueueOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { RefreshToken } from '../src/modules/auth/models/RefreshToken';
import { User } from '../src/modules/auth/models/User';
import { refreshTokens, logoutUser } from '../src/modules/auth/authService';

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockRefreshToken = RefreshToken as jest.Mocked<typeof RefreshToken>;
const mockUser = User as jest.Mocked<typeof User>;

const userId = new Types.ObjectId().toString();

describe('refreshTokens — rotation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes old token and issues new tokens on valid refresh', async () => {
    const storedTokenId = new Types.ObjectId();
    const rawToken = 'valid-raw-token';

    const storedDoc = {
      _id: storedTokenId,
      userId: new Types.ObjectId(userId),
      token: 'hashed-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    (mockRefreshToken.find as jest.Mock).mockResolvedValue([storedDoc]);
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockRefreshToken.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
    (mockUser.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(userId),
      email: 'user@example.com',
      role: 'user',
      isBlocked: false,
    });
    (mockRefreshToken.create as jest.Mock).mockResolvedValue({});
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-token');

    const result = await refreshTokens({ token: rawToken });

    // Old token was deleted
    expect(mockRefreshToken.deleteOne).toHaveBeenCalledWith({ _id: storedTokenId });

    // New tokens were issued
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('throws 401 when no matching refresh token is found', async () => {
    (mockRefreshToken.find as jest.Mock).mockResolvedValue([]);

    await expect(refreshTokens({ token: 'invalid-token' })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired refresh token',
    });

    expect(mockRefreshToken.deleteOne).not.toHaveBeenCalled();
  });

  it('throws 401 when token hash does not match any stored token', async () => {
    const storedDoc = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      token: 'hashed-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    (mockRefreshToken.find as jest.Mock).mockResolvedValue([storedDoc]);
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(refreshTokens({ token: 'wrong-token' })).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(mockRefreshToken.deleteOne).not.toHaveBeenCalled();
  });
});

describe('logoutUser — invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all refresh tokens for the user', async () => {
    (mockRefreshToken.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });

    await logoutUser({ userId });

    expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({ userId });
  });

  it('succeeds even when user has no refresh tokens', async () => {
    (mockRefreshToken.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });

    await expect(logoutUser({ userId })).resolves.toBeUndefined();
    expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({ userId });
  });
});
