"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.generateTokens = generateTokens;
exports.loginUser = loginUser;
exports.refreshTokens = refreshTokens;
exports.logoutUser = logoutUser;
exports.verifyOtp = verifyOtp;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const User_1 = require("./models/User");
const OTP_1 = require("./models/OTP");
const RefreshToken_1 = require("./models/RefreshToken");
const AppError_1 = require("../../utils/AppError");
const emailQueue_1 = require("../../jobs/emailQueue");
const env_1 = require("../../config/env");
const BCRYPT_COST = 12;
const OTP_EXPIRY_MINUTES = 10;
async function registerUser(input) {
    const { email, displayName, password } = input;
    // Check for duplicate email
    const existing = await User_1.User.findOne({ email: email.toLowerCase() });
    if (existing) {
        throw new AppError_1.AppError('Email already in use', 409);
    }
    // Hash password
    const passwordHash = await bcrypt_1.default.hash(password, BCRYPT_COST);
    // Create user
    const user = await User_1.User.create({
        email: email.toLowerCase(),
        displayName,
        passwordHash,
        isVerified: false,
    });
    // Generate 6-digit OTP
    const otpCode = crypto_1.default.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt_1.default.hash(otpCode, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await OTP_1.OTP.create({ userId: user._id, codeHash, expiresAt });
    // Log OTP in development so it can be used without email setup
    if (env_1.env.NODE_ENV !== 'production') {
        console.log(`\n📧 OTP for ${user.email}: ${otpCode}\n`);
    }
    // Enqueue OTP email — fire and forget, don't fail registration if this errors
    (0, emailQueue_1.enqueueOtpEmail)(user.email, otpCode).catch((err) => console.warn('Failed to enqueue OTP email:', err?.message));
    return user;
}
async function generateTokens(userId, email, role) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, email, role }, env_1.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15m',
    });
    const rawToken = (0, uuid_1.v4)();
    const hashedToken = await bcrypt_1.default.hash(rawToken, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken_1.RefreshToken.create({ userId, token: hashedToken, expiresAt });
    return { accessToken, refreshToken: rawToken };
}
async function loginUser(input) {
    const { email, password } = input;
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    if (!user || user.isBlocked) {
        throw new AppError_1.AppError('Invalid credentials', 401);
    }
    const passwordMatch = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!passwordMatch) {
        throw new AppError_1.AppError('Invalid credentials', 401);
    }
    if (!user.isVerified) {
        throw new AppError_1.AppError('Email not verified', 403);
    }
    const tokens = await generateTokens(user._id.toString(), user.email, user.role);
    return {
        ...tokens,
        user: {
            id: user._id.toString(),
            email: user.email,
            displayName: user.displayName,
            role: user.role,
        },
    };
}
async function refreshTokens(input) {
    const { token } = input;
    const storedTokens = await RefreshToken_1.RefreshToken.find({ expiresAt: { $gt: new Date() } });
    let matchedToken = null;
    for (const stored of storedTokens) {
        const isMatch = await bcrypt_1.default.compare(token, stored.token);
        if (isMatch) {
            matchedToken = stored;
            break;
        }
    }
    if (!matchedToken) {
        throw new AppError_1.AppError('Invalid or expired refresh token', 401);
    }
    const userId = matchedToken.userId.toString();
    await RefreshToken_1.RefreshToken.deleteOne({ _id: matchedToken._id });
    // Fetch user to get current email and role
    const user = await User_1.User.findById(userId);
    if (!user || user.isBlocked) {
        throw new AppError_1.AppError('User not found or blocked', 401);
    }
    return generateTokens(userId, user.email, user.role);
}
async function logoutUser(input) {
    await RefreshToken_1.RefreshToken.deleteMany({ userId: input.userId });
}
async function verifyOtp(input) {
    const { email, otp } = input;
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    const otpDoc = await OTP_1.OTP.findOne({
        userId: user._id,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!otpDoc) {
        throw new AppError_1.AppError('OTP expired or not found', 400);
    }
    const valid = await bcrypt_1.default.compare(otp, otpDoc.codeHash);
    if (!valid) {
        throw new AppError_1.AppError('Invalid OTP', 400);
    }
    await OTP_1.OTP.deleteOne({ _id: otpDoc._id });
    user.isVerified = true;
    await user.save();
    const tokens = await generateTokens(user._id.toString(), user.email, user.role);
    return {
        ...tokens,
        user: {
            id: user._id.toString(),
            email: user.email,
            displayName: user.displayName,
            role: user.role,
        },
    };
}
async function forgotPassword(input) {
    const { email } = input;
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    // Silently succeed if user not found (security: don't reveal email existence)
    if (!user)
        return;
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString() }, env_1.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '30m',
        subject: 'password-reset',
    });
    const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${token}`;
    if (env_1.env.NODE_ENV !== 'production') {
        console.log(`\n🔑 Password reset URL for ${user.email}: ${resetUrl}\n`);
    }
    // Fire and forget
    (0, emailQueue_1.enqueuePasswordResetEmail)(user.email, resetUrl).catch((err) => console.warn('Failed to enqueue reset email:', err?.message));
}
async function resetPassword(input) {
    const { token, password } = input;
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, env_1.env.ACCESS_TOKEN_SECRET, {
            subject: 'password-reset',
        });
    }
    catch {
        throw new AppError_1.AppError('Invalid or expired reset token', 400);
    }
    const user = await User_1.User.findById(payload.userId);
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    user.passwordHash = await bcrypt_1.default.hash(password, BCRYPT_COST);
    await user.save();
    await logoutUser({ userId: user._id.toString() });
}
//# sourceMappingURL=authService.js.map