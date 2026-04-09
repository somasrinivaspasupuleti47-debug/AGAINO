/**
 * Public rate limiter: 100 requests per minute per IP.
 * Returns 429 when exceeded.
 */
export declare const publicRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Auth route rate limiter: 10 requests per minute per IP.
 * Returns 429 when exceeded.
 */
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map