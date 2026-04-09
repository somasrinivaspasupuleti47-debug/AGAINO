import { Request, Response, NextFunction } from 'express';
/**
 * CSRF protection middleware.
 *
 * - Generates a random token and sets it in the `XSRF-TOKEN` cookie on every request.
 * - For state-changing methods (POST/PUT/PATCH/DELETE), verifies that the
 *   `X-CSRF-Token` request header matches the cookie value.
 * - Auth routes (/api/v1/auth/) are skipped — they rely on JWT.
 * - Returns 403 if the token is missing or invalid.
 */
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=csrf.d.ts.map