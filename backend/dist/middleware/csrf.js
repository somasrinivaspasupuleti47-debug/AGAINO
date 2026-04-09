"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = csrfProtection;
const crypto_1 = __importDefault(require("crypto"));
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
function csrfProtection(req, res, next) {
    // Skip CSRF for auth routes (JWT-protected)
    if (req.originalUrl.startsWith('/api/v1/auth/')) {
        next();
        return;
    }
    // Generate a new token if one isn't already set in the cookie
    let token = req.cookies?.[COOKIE_NAME];
    if (!token) {
        token = crypto_1.default.randomBytes(32).toString('hex');
        res.cookie(COOKIE_NAME, token, {
            httpOnly: false, // Must be readable by JS so the client can send it as a header
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
        });
    }
    // Validate on state-changing requests
    if (STATE_CHANGING_METHODS.has(req.method)) {
        const headerToken = req.headers[HEADER_NAME];
        if (!headerToken || headerToken !== token) {
            res.status(403).json({ status: 'fail', error: 'Invalid or missing CSRF token' });
            return;
        }
    }
    next();
}
//# sourceMappingURL=csrf.js.map