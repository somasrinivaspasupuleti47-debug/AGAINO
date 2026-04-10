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
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
const emailQueue_1 = require("../../jobs/emailQueue");
const env_1 = require("../../config/env");
const BCRYPT_COST = 12;
const OTP_EXPIRY_MINUTES = 10;
async function registerUser(input) {
    const { email, displayName, password } = input;
    // Check for duplicate email
    const { data: existing } = await supabase_1.supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
    if (existing) {
        throw new AppError_1.AppError('Email already in use', 409);
    }
    // Hash password
    const passwordHash = await bcrypt_1.default.hash(password, BCRYPT_COST);
    // Create user
    const { data: user, error: userError } = await supabase_1.supabase
        .from('users')
        .insert({
        email: email.toLowerCase(),
        display_name: displayName,
        password_hash: passwordHash,
        is_verified: false,
    })
        .select()
        .single();
    if (userError || !user) {
        throw new AppError_1.AppError(`User creation failed: ${userError?.message}`, 500);
    }
    // Generate 6-digit OTP
    const otpCode = crypto_1.default.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt_1.default.hash(otpCode, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    const { error: otpError } = await supabase_1.supabase
        .from('otps')
        .insert({ user_id: user.id, code_hash: codeHash, expires_at: expiresAt });
    if (otpError) {
        console.warn('Failed to store OTP:', otpError.message);
    }
    // Log OTP in development so it can be used without email setup
    if (env_1.env.NODE_ENV !== 'production') {
        console.log(`\n📧 OTP for ${user.email}: ${otpCode}\n`);
    }
    // Enqueue OTP email
    (0, emailQueue_1.enqueueOtpEmail)(user.email, otpCode).catch((err) => console.warn('Failed to enqueue OTP email:', err?.message));
    return user;
}
async function generateTokens(userId, email, role) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, email, role }, env_1.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15m',
    });
    const rawToken = (0, uuid_1.v4)();
    const hashedToken = await bcrypt_1.default.hash(rawToken, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase_1.supabase
        .from('refresh_tokens')
        .insert({ user_id: userId, token: hashedToken, expires_at: expiresAt });
    return { accessToken, refreshToken: rawToken };
}
async function loginUser(input) {
    const { email, password } = input;
    const { data: user } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    if (!user || user.is_blocked) {
        throw new AppError_1.AppError('Invalid credentials', 401);
    }
    const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash);
    if (!passwordMatch) {
        throw new AppError_1.AppError('Invalid credentials', 401);
    }
    if (!user.is_verified) {
        throw new AppError_1.AppError('Email not verified', 403);
    }
    const tokens = await generateTokens(user.id, user.email, user.role);
    return {
        ...tokens,
        user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
        },
    };
}
async function refreshTokens(input) {
    const { token } = input;
    const { data: storedTokens } = await supabase_1.supabase
        .from('refresh_tokens')
        .select('*')
        .gt('expires_at', new Date().toISOString());
    let matchedToken = null;
    if (storedTokens) {
        for (const stored of storedTokens) {
            const isMatch = await bcrypt_1.default.compare(token, stored.token);
            if (isMatch) {
                matchedToken = stored;
                break;
            }
        }
    }
    if (!matchedToken) {
        throw new AppError_1.AppError('Invalid or expired refresh token', 401);
    }
    const userId = matchedToken.user_id;
    await supabase_1.supabase.from('refresh_tokens').delete().eq('id', matchedToken.id);
    // Fetch user to get current email and role
    const { data: user } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (!user || user.is_blocked) {
        throw new AppError_1.AppError('User not found or blocked', 401);
    }
    return generateTokens(userId, user.email, user.role);
}
async function logoutUser(input) {
    await supabase_1.supabase.from('refresh_tokens').delete().eq('user_id', input.userId);
}
async function verifyOtp(input) {
    const { email, otp } = input;
    const { data: user } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    const { data: otps } = await supabase_1.supabase
        .from('otps')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
    const otpDoc = otps && otps[0];
    if (!otpDoc) {
        throw new AppError_1.AppError('OTP expired or not found', 400);
    }
    const valid = await bcrypt_1.default.compare(otp, otpDoc.code_hash);
    if (!valid) {
        throw new AppError_1.AppError('Invalid OTP', 400);
    }
    await supabase_1.supabase.from('otps').delete().eq('id', otpDoc.id);
    await supabase_1.supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', user.id);
    const tokens = await generateTokens(user.id, user.email, user.role);
    return {
        ...tokens,
        user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
        },
    };
}
async function forgotPassword(input) {
    const { email } = input;
    const { data: user } = await supabase_1.supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single();
    // Silently succeed if user not found (security: don't reveal email existence)
    if (!user)
        return;
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '30m',
        subject: 'password-reset',
    });
    const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${token}`;
    if (env_1.env.NODE_ENV !== 'production') {
        console.log(`\n🔑 Password reset URL for ${user.email}: ${resetUrl}\n`);
    }
    // Fire and forget
    const { enqueuePasswordResetEmail } = require('../../jobs/emailQueue');
    enqueuePasswordResetEmail(user.email, resetUrl).catch((err) => console.warn('Failed to enqueue reset email:', err?.message));
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
    const { data: user } = await supabase_1.supabase
        .from('users')
        .select('id')
        .eq('id', payload.userId)
        .single();
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    const passwordHash = await bcrypt_1.default.hash(password, BCRYPT_COST);
    await supabase_1.supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', user.id);
    await logoutUser({ userId: user.id });
}
//# sourceMappingURL=authService.js.map