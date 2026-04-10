import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/AppError';
import { enqueueOtpEmail } from '../../jobs/emailQueue';
import { env } from '../../config/env';

const BCRYPT_COST = 12;
const OTP_EXPIRY_MINUTES = 10;

interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
}

export async function registerUser(input: RegisterInput): Promise<any> {
  const { email, displayName, password } = input;

  // Check for duplicate email
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      display_name: displayName,
      password_hash: passwordHash,
      is_verified: false,
    })
    .select()
    .single();

  if (userError || !user) {
    throw new AppError(`User creation failed: ${userError?.message}`, 500);
  }

  // Generate 6-digit OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(otpCode, BCRYPT_COST);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  
  const { error: otpError } = await supabase
    .from('otps')
    .insert({ user_id: user.id, code_hash: codeHash, expires_at: expiresAt });

  if (otpError) {
    console.warn('Failed to store OTP:', otpError.message);
  }

  // Log OTP in development so it can be used without email setup
  if (env.NODE_ENV !== 'production') {
    console.log(`\n📧 OTP for ${user.email}: ${otpCode}\n`);
  }

  // Enqueue OTP email
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await supabase
    .from('refresh_tokens')
    .insert({ user_id: userId, token: hashedToken, expires_at: expiresAt });

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

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (!user || user.is_blocked) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.is_verified) {
    throw new AppError('Email not verified', 403);
  }

  const tokens = await generateTokens(
    user.id,
    user.email,
    user.role,
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
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

  const { data: storedTokens } = await supabase
    .from('refresh_tokens')
    .select('*')
    .gt('expires_at', new Date().toISOString());

  let matchedToken: any = null;
  if (storedTokens) {
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(token, stored.token);
      if (isMatch) {
        matchedToken = stored;
        break;
      }
    }
  }

  if (!matchedToken) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const userId = matchedToken.user_id;
  await supabase.from('refresh_tokens').delete().eq('id', matchedToken.id);

  // Fetch user to get current email and role
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user || user.is_blocked) {
    throw new AppError('User not found or blocked', 401);
  }

  return generateTokens(userId, user.email, user.role);
}

// ── Logout ────────────────────────────────────────────────────────────────────

interface LogoutInput {
  userId: string;
}

export async function logoutUser(input: LogoutInput): Promise<void> {
  await supabase.from('refresh_tokens').delete().eq('user_id', input.userId);
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

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { data: otps } = await supabase
    .from('otps')
    .select('*')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const otpDoc = otps && otps[0];

  if (!otpDoc) {
    throw new AppError('OTP expired or not found', 400);
  }

  const valid = await bcrypt.compare(otp, otpDoc.code_hash);
  if (!valid) {
    throw new AppError('Invalid OTP', 400);
  }

  await supabase.from('otps').delete().eq('id', otpDoc.id);

  await supabase
    .from('users')
    .update({ is_verified: true })
    .eq('id', user.id);

  const tokens = await generateTokens(
    user.id,
    user.email,
    user.role,
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
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

  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .single();

  // Silently succeed if user not found (security: don't reveal email existence)
  if (!user) return;

  const token = jwt.sign(
    { userId: user.id },
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
  const { enqueuePasswordResetEmail } = require('../../jobs/emailQueue');
  enqueuePasswordResetEmail(user.email, resetUrl).catch((err: any) =>
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

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('id', payload.userId)
    .single();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', user.id);

  await logoutUser({ userId: user.id });
}
