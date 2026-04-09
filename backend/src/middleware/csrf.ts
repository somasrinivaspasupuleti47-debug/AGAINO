import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'x-csrf-token';

/**
 * CSRF protection middleware.
 *
 * - Generates a random token and sets it in the `XSRF-TOKEN` cookie on every request.
 * - For state-changing methods (POST/PUT/PATCH/DELETE), verifies that the
 *   `X-CSRF-Token` request header matches the cookie value.
 * - Auth routes (/api/v1/auth/) are skipped — they rely on JWT.
 * - Returns 403 if the token is missing or invalid.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for auth routes (JWT-protected)
  if (req.originalUrl.startsWith('/api/v1/auth/')) {
    next();
    return;
  }

  // Generate a new token if one isn't already set in the cookie
  let token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JS so the client can send it as a header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // Validate on state-changing requests
  if (STATE_CHANGING_METHODS.has(req.method)) {
    const headerToken = req.headers[HEADER_NAME] as string | undefined;
    if (!headerToken || headerToken !== token) {
      res.status(403).json({ status: 'fail', error: 'Invalid or missing CSRF token' });
      return;
    }
  }

  next();
}
