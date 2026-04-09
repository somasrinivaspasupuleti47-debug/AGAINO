"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.publicRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Public rate limiter: 100 requests per minute per IP.
 * Returns 429 when exceeded.
 */
exports.publicRateLimiter = (0, express_rate_limit_1.default)({
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
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', error: 'Too many login attempts, please try again later.' },
});
//# sourceMappingURL=rateLimiter.js.map