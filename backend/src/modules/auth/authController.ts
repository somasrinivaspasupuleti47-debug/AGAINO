import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerUser,
  verifyOtp,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword,
} from './authService';
import { AppError } from '../../utils/AppError';

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(50),
  password: z.string().min(8),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: 'fail',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await registerUser(parsed.data);
    res.status(201).json({ message: 'Registration successful. Check your email for OTP.' });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 409) {
      res.status(409).json({ status: 'fail', message: err.message });
      return;
    }
    next(err);
  }
}

export async function verifyOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: 'fail',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await verifyOtp(parsed.data);
    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ status: 'fail', message: err.message });
      return;
    }
    next(err);
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  token: z.string(),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const result = await loginUser(parsed.data);
    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ status: 'fail', message: err.message });
      return;
    }
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const tokens = await refreshTokens(parsed.data);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ status: 'fail', message: err.message });
      return;
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    await logoutUser({ userId });
    res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function forgotPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    await forgotPassword(parsed.data);
    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    await resetPassword(parsed.data);
    res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ status: 'fail', message: err.message });
      return;
    }
    next(err);
  }
}
