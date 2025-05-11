import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:3000/auth/google/callback',
    },
    (accessToken: string, refreshToken: string, profile: passport.Profile, done: (error: any, user?: any) => void) => {
      
      return done(null, profile);
    }
  )
);

passport.serializeUser((user: Express.User, done: (err: any, id?: any) => void) => done(null, user));
passport.deserializeUser((user: Express.User, done: (err: any, user?: any) => void) => done(null, user));

export default passport;