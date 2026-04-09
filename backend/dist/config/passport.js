"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = require("../modules/auth/models/User");
const env_1 = require("./env");
// Only register Google strategy when credentials are configured
if (env_1.env.GOOGLE_CLIENT_ID && env_1.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: env_1.env.GOOGLE_CLIENT_ID,
        clientSecret: env_1.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env_1.env.FRONTEND_URL}/api/v1/auth/google/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(new Error('No email returned from Google'), undefined);
            }
            let user = await User_1.User.findOne({ $or: [{ googleId: profile.id }, { email }] });
            if (!user) {
                user = await User_1.User.create({
                    email,
                    displayName: profile.displayName,
                    passwordHash: '',
                    googleId: profile.id,
                    avatar: profile.photos?.[0]?.value,
                    isVerified: true,
                });
            }
            else if (!user.googleId) {
                user.googleId = profile.id;
                if (!user.avatar && profile.photos?.[0]?.value) {
                    user.avatar = profile.photos[0].value;
                }
                await user.save();
            }
            return done(null, user);
        }
        catch (err) {
            return done(err, undefined);
        }
    }));
}
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map