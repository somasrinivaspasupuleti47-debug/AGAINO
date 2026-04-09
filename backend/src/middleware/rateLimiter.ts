import rateLimit from 'express-rate-limit';

/**
 * Public rate limiter: 100 requests per minute per IP.
 * Returns 429 when exceeded.
 */
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', error: 'Too many requests, please try again later.' },
});

/**
 * Auth route rate limiter: 10 requests per minute per IP.
 * Returns 429 when exceeded.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', error: 'Too many login attempts, please try again later.' },
});
