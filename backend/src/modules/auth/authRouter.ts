import { Router, Request, Response, NextFunction } from 'express';
import passport from '../../config/passport';
import {
  register,
  verifyOtpHandler,
  login,
  refresh,
  logout,
  forgotPasswordHandler,
  resetPasswordHandler,
} from './authController';
import { requireAuth } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { generateTokens } from './authService';
import { env } from '../../config/env';
import { IUser } from './models/User';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, register);
authRouter.post('/verify-otp', authRateLimiter, verifyOtpHandler);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', requireAuth, logout);
authRouter.post('/forgot-password', authRateLimiter, forgotPasswordHandler);
authRouter.post('/reset-password', authRateLimiter, resetPasswordHandler);

// Google OAuth
authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/login?error=oauth_failed`,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as unknown as IUser;
      const userId = (user._id as unknown as string).toString();
      const { accessToken, refreshToken } = await generateTokens(userId, user.email, user.role);
      res.redirect(
        `${env.FRONTEND_URL}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
      );
    } catch (err) {
      next(err);
    }
  },
);
