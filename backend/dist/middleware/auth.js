"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ status: 'fail', message: 'No token provided' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.ACCESS_TOKEN_SECRET);
        req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
        next();
    }
    catch {
        res.status(401).json({ status: 'fail', message: 'Invalid or expired token' });
    }
}
function requireAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ status: 'fail', message: 'Not authenticated' });
        return;
    }
    if (req.user.role !== 'admin' || req.user.email !== env_1.env.ADMIN_EMAIL) {
        res.status(403).json({ status: 'fail', message: 'Forbidden' });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map