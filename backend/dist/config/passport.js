"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const supabase_1 = require("./supabase");
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
            // Check for user by google_id or email
            const { data: existingUser } = await supabase_1.supabase
                .from('users')
                .select('*')
                .or(`google_id.eq.${profile.id},email.eq.${email}`)
                .single();
            let user = existingUser;
            if (!user) {
                const { data: newUser, error: createError } = await supabase_1.supabase
                    .from('users')
                    .insert({
                    email,
                    display_name: profile.displayName,
                    password_hash: '',
                    google_id: profile.id,
                    avatar: profile.photos?.[0]?.value,
                    is_verified: true,
                })
                    .select()
                    .single();
                if (createError)
                    throw createError;
                user = newUser;
            }
            else if (!user.google_id) {
                const { data: updatedUser, error: updateError } = await supabase_1.supabase
                    .from('users')
                    .update({
                    google_id: profile.id,
                    avatar: user.avatar || profile.photos?.[0]?.value,
                })
                    .eq('id', user.id)
                    .select()
                    .single();
                if (updateError)
                    throw updateError;
                user = updatedUser;
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