import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { supabase } from './supabase';
import { env } from './env';

// Only register Google strategy when credentials are configured
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.FRONTEND_URL}/api/v1/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'), undefined);
          }

          // Check for user by google_id or email
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .or(`google_id.eq.${profile.id},email.eq.${email}`)
            .single();

          let user = existingUser;

          if (!user) {
            const { data: newUser, error: createError } = await supabase
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
            
            if (createError) throw createError;
            user = newUser;
          } else if (!user.google_id) {
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({
                google_id: profile.id,
                avatar: user.avatar || profile.photos?.[0]?.value,
              })
              .eq('id', user.id)
              .select()
              .single();
            
            if (updateError) throw updateError;
            user = updatedUser;
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      },
    ),
  );
}

export default passport;
