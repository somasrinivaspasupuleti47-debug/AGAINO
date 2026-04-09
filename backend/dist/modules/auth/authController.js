"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyOtpHandler = verifyOtpHandler;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.forgotPasswordHandler = forgotPasswordHandler;
exports.resetPasswordHandler = resetPasswordHandler;
const zod_1 = require("zod");
const authService_1 = require("./authService");
const AppError_1 = require("../../utils/AppError");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string().min(1).max(50),
    password: zod_1.z.string().min(8),
});
const verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
});
async function register(req, res, next) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            status: 'fail',
            errors: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    try {
        await (0, authService_1.registerUser)(parsed.data);
        res.status(201).json({ message: 'Registration successful. Check your email for OTP.' });
    }
    catch (err) {
        if (err instanceof AppError_1.AppError && err.statusCode === 409) {
            res.status(409).json({ status: 'fail', message: err.message });
            return;
        }
        next(err);
    }
}
async function verifyOtpHandler(req, res, next) {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            status: 'fail',
            errors: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    try {
        const result = await (0, authService_1.verifyOtp)(parsed.data);
        res.status(200).json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        });
    }
    catch (err) {
        if (err instanceof AppError_1.AppError) {
            res.status(err.statusCode).json({ status: 'fail', message: err.message });
            return;
        }
        next(err);
    }
}
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const refreshSchema = zod_1.z.object({
    token: zod_1.z.string(),
});
async function login(req, res, next) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
        return;
    }
    try {
        const result = await (0, authService_1.loginUser)(parsed.data);
        res.status(200).json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        });
    }
    catch (err) {
        if (err instanceof AppError_1.AppError) {
            res.status(err.statusCode).json({ status: 'fail', message: err.message });
            return;
        }
        next(err);
    }
}
async function refresh(req, res, next) {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
        return;
    }
    try {
        const tokens = await (0, authService_1.refreshTokens)(parsed.data);
        res.status(200).json(tokens);
    }
    catch (err) {
        if (err instanceof AppError_1.AppError) {
            res.status(err.statusCode).json({ status: 'fail', message: err.message });
            return;
        }
        next(err);
    }
}
async function logout(req, res, next) {
    try {
        const userId = req.user.userId;
        await (0, authService_1.logoutUser)({ userId });
        res.status(200).json({ message: 'Logged out' });
    }
    catch (err) {
        next(err);
    }
}
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    password: zod_1.z.string().min(8),
});
async function forgotPasswordHandler(req, res, next) {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
        return;
    }
    try {
        await (0, authService_1.forgotPassword)(parsed.data);
        res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }
    catch (err) {
        next(err);
    }
}
async function resetPasswordHandler(req, res, next) {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
        return;
    }
    try {
        await (0, authService_1.resetPassword)(parsed.data);
        res.status(200).json({ message: 'Password reset successful.' });
    }
    catch (err) {
        if (err instanceof AppError_1.AppError) {
            res.status(err.statusCode).json({ status: 'fail', message: err.message });
            return;
        }
        next(err);
    }
}
//# sourceMappingURL=authController.js.map