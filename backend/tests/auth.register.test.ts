import { z } from 'zod';
import { AppError } from '../src/utils/AppError';

// ── Zod schema (mirrored from authController) ────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(50),
  password: z.string().min(8),
});

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../src/modules/auth/models/User');
jest.mock('bcrypt');
jest.mock('../src/jobs/emailQueue', () => ({
  enqueueOtpEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/modules/auth/models/OTP', () => ({
  OTP: { create: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../src/config/env', () => ({
  env: { ACCESS_TOKEN_SECRET: 'test-secret', REFRESH_TOKEN_SECRET: 'test-refresh' },
}));

import { User } from '../src/modules/auth/models/User';
import bcrypt from 'bcrypt';
import { registerUser } from '../src/modules/auth/authService';

const mockUser = User as jest.Mocked<typeof User>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ── Zod validation tests ──────────────────────────────────────────────────────

describe('registerSchema (Zod validation)', () => {
  it('rejects missing email', () => {
    const result = registerSchema.safeParse({ displayName: 'Alice', password: 'password123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      displayName: 'Alice',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it('rejects missing displayName', () => {
    const result = registerSchema.safeParse({ email: 'alice@example.com', password: 'password123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.displayName).toBeDefined();
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'alice@example.com',
      displayName: 'Alice',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it('accepts valid input', () => {
    const result = registerSchema.safeParse({
      email: 'alice@example.com',
      displayName: 'Alice',
      password: 'securepassword',
    });
    expect(result.success).toBe(true);
  });
});

// ── registerUser service tests ────────────────────────────────────────────────

describe('registerUser service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user when email is not taken', async () => {
    (mockUser.findOne as jest.Mock).mockResolvedValue(null);
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (mockUser.create as jest.Mock).mockResolvedValue({
      _id: 'user-id-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      isVerified: false,
    });

    const result = await registerUser({
      email: 'alice@example.com',
      displayName: 'Alice',
      password: 'securepassword',
    });

    expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'alice@example.com' });
    expect(mockUser.create).toHaveBeenCalled();
    expect(result).toMatchObject({ email: 'alice@example.com', displayName: 'Alice' });
  });

  it('throws AppError 409 when email is already in use', async () => {
    (mockUser.findOne as jest.Mock).mockResolvedValue({
      _id: 'existing-id',
      email: 'alice@example.com',
    });

    await expect(
      registerUser({ email: 'alice@example.com', displayName: 'Alice', password: 'securepassword' })
    ).rejects.toMatchObject({ statusCode: 409, message: 'Email already in use' });

    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it('stores a bcrypt hash instead of the plain password', async () => {
    (mockUser.findOne as jest.Mock).mockResolvedValue(null);
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedvalue');
    (mockUser.create as jest.Mock).mockResolvedValue({
      _id: 'user-id-2',
      email: 'bob@example.com',
      displayName: 'Bob',
      passwordHash: '$2b$12$hashedvalue',
      isVerified: false,
    });

    await registerUser({
      email: 'bob@example.com',
      displayName: 'Bob',
      password: 'plaintextpassword',
    });

    const createCall = (mockUser.create as jest.Mock).mock.calls[0][0];
    expect(createCall.passwordHash).toBe('$2b$12$hashedvalue');
    expect(createCall.passwordHash).not.toBe('plaintextpassword');
    expect(mockBcrypt.hash).toHaveBeenCalledWith('plaintextpassword', 12);
  });
});
