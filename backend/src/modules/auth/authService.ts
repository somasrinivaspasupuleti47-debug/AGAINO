import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, IUser } from './models/User';
import { OTP } from './models/OTP';
import { RefreshToken } from './models/RefreshToken';
import { AppError } from '../../utils/AppError';
import { enqueueOtpEmail, enqueuePasswordResetEmail } from '../../jobs/emailQueue';
import { env } from '../../config/env';

const BCRYPT_COST = 12;
const OTP_EXPIRY_MINUTES = 10;

interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
}

export async function registerUser(input: RegisterInput): Promise<IUser> {
  const { email, displayName, password } = input;

  // Check for duplicate email
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    displayName,
    passwordHash,
    isVerified: false,
  });

  // Generate 6-digit OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(otpCode, BCRYPT_COST);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await OTP.create({ userId: user._id, codeHash, expiresAt });

  // Log OTP in development so it can be used without email setup
  if (env.NODE_ENV !== 'production') {
    console.log(`\n📧 OTP for ${user.email}: ${otpCode}\n`);
  }

  // Enqueue OTP email — fire and forget, don't fail registration if this errors
  enqueueOtpEmail(user.email, otpCode).catch((err) =>
    console.warn('Failed to enqueue OTP email:', err?.message),
  );

  return user;
}

// ── Token generation ──────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function generateTokens(
  userId: string,
  email: string,
  role: string,
): Promise<TokenPair> {
  const accessToken = jwt.sign({ userId, email, role }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });

  const rawToken = uuidv4();
  const hashedToken = await bcrypt.hash(rawToken, BCRYPT_COST);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token: hashedToken, expiresAt });

  return { accessToken, refreshToken: rawToken };
}

// ── Login ─────────────────────────────────────────────────────────────────────

interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult extends TokenPair {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const { email, password } = input;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.isBlocked) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Email not verified', 403);
  }

  const tokens = await generateTokens(
    (user._id as unknown as string).toString(),
    user.email,
    user.role,
  );

  return {
    ...tokens,
    user: {
      id: (user._id as unknown as string).toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

// ── Refresh tokens ────────────────────────────────────────────────────────────

interface RefreshInput {
  token: string;
}

export async function refreshTokens(input: RefreshInput): Promise<TokenPair> {
  const { token } = input;

  const storedTokens = await RefreshToken.find({ expiresAt: { $gt: new Date() } });

  let matchedToken: (typeof storedTokens)[0] | null = null;
  for (const stored of storedTokens) {
    const isMatch = await bcrypt.compare(token, stored.token);
    if (isMatch) {
      matchedToken = stored;
      break;
    }
  }

  if (!matchedToken) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const userId = matchedToken.userId.toString();
  await RefreshToken.deleteOne({ _id: matchedToken._id });

  // Fetch user to get current email and role
  const user = await User.findById(userId);
  if (!user || user.isBlocked) {
    throw new AppError('User not found or blocked', 401);
  }

  return generateTokens(userId, user.email, user.role);
}

// ── Logout ────────────────────────────────────────────────────────────────────

interface LogoutInput {
  userId: string;
}

export async function logoutUser(input: LogoutInput): Promise<void> {
  await RefreshToken.deleteMany({ userId: input.userId });
}

// ── OTP verification ──────────────────────────────────────────────────────────

interface VerifyOtpInput {
  email: string;
  otp: string;
}

export interface VerifyOtpResult extends TokenPair {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  const { email, otp } = input;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const otpDoc = await OTP.findOne({
    userId: user._id,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpDoc) {
    throw new AppError('OTP expired or not found', 400);
  }

  const valid = await bcrypt.compare(otp, otpDoc.codeHash);
  if (!valid) {
    throw new AppError('Invalid OTP', 400);
  }

  await OTP.deleteOne({ _id: otpDoc._id });

  user.isVerified = true;
  await user.save();

  const tokens = await generateTokens(
    (user._id as unknown as string).toString(),
    user.email,
    user.role,
  );

  return {
    ...tokens,
    user: {
      id: (user._id as unknown as string).toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

// ── Forgot password ───────────────────────────────────────────────────────────

interface ForgotPasswordInput {
  email: string;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const { email } = input;

  const user = await User.findOne({ email: email.toLowerCase() });
  // Silently succeed if user not found (security: don't reveal email existence)
  if (!user) return;

  const token = jwt.sign(
    { userId: (user._id as unknown as string).toString() },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '30m',
      subject: 'password-reset',
    },
  );

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  if (env.NODE_ENV !== 'production') {
    console.log(`\n🔑 Password reset URL for ${user.email}: ${resetUrl}\n`);
  }

  // Fire and forget
  enqueuePasswordResetEmail(user.email, resetUrl).catch((err) =>
    console.warn('Failed to enqueue reset email:', err?.message),
  );
}

// ── Reset password ────────────────────────────────────────────────────────────

interface ResetPasswordInput {
  token: string;
  password: string;
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const { token, password } = input;

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      subject: 'password-reset',
    }) as jwt.JwtPayload;
  } catch {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await user.save();

  await logoutUser({ userId: (user._id as unknown as string).toString() });
}
