"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const passport_1 = __importDefault(require("../../config/passport"));
const authController_1 = require("./authController");
const auth_1 = require("../../middleware/auth");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const authService_1 = require("./authService");
const env_1 = require("../../config/env");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', rateLimiter_1.authRateLimiter, authController_1.register);
exports.authRouter.post('/verify-otp', rateLimiter_1.authRateLimiter, authController_1.verifyOtpHandler);
exports.authRouter.post('/login', rateLimiter_1.authRateLimiter, authController_1.login);
exports.authRouter.post('/refresh', authController_1.refresh);
exports.authRouter.post('/logout', auth_1.requireAuth, authController_1.logout);
exports.authRouter.post('/forgot-password', rateLimiter_1.authRateLimiter, authController_1.forgotPasswordHandler);
exports.authRouter.post('/reset-password', rateLimiter_1.authRateLimiter, authController_1.resetPasswordHandler);
// Google OAuth
exports.authRouter.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'], session: false }));
exports.authRouter.get('/google/callback', passport_1.default.authenticate('google', {
    session: false,
    failureRedirect: `${env_1.env.FRONTEND_URL}/login?error=oauth_failed`,
}), async (req, res, next) => {
    try {
        const user = req.user;
        const { accessToken, refreshToken } = await (0, authService_1.generateTokens)(user.id, user.email, user.role);
        res.redirect(`${env_1.env.FRONTEND_URL}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=authRouter.js.map