"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBody = sanitizeBody;
const xss_1 = __importDefault(require("xss"));
/**
 * Recursively sanitizes all string values in an object using the xss package.
 */
function sanitizeValue(value) {
    if (typeof value === 'string') {
        return (0, xss_1.default)(value);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
    }
    return value;
}
/**
 * Middleware that recursively sanitizes all string fields in req.body
 * using the xss package to prevent XSS attacks.
 */
function sanitizeBody(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    next();
}
//# sourceMappingURL=sanitize.js.map