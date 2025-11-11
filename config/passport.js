// ===================================================================
// FILE: config/passport.js
// ===================================================================
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const configurePassport = () => {
  // Local Strategy
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
  }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user || !user.password) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return done(null, false, { message: 'Incorrect email or password.' });
      return done(null, user);
    } catch (e) {
      return done(e);
    }
  }));

  // Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      if (req.user) {
        const user = await User.findById(req.user.id);
        if (!user) return done(null, false, { message: 'User not found.' });
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
          return done(null, user, { message: 'Google account linked.' });
        }
        return done(null, user, { message: 'Google already linked.' });
      }

      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      const email = profile.emails?.[0]?.value || null;
      if (email) {
        user = await User.findOne({ email });
        if (user && !user.googleId) {
          user.googleId = profile.id;
          await user.save();
          return done(null, user, { message: 'Google linked to existing email.' });
        }
      }

      const newUser = new User({
        googleId: profile.id,
        email: email || `google_${profile.id}@noemail.com`,
        name: profile.displayName,
        profilePhotoUrl: profile.photos?.[0]?.value || null,
        role:null,
      });
      await newUser.save();
      return done(null, newUser);
    } catch (e) {
      return done(e);
    }
  }));

  // Facebook Strategy
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'photos'],
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      if (req.user) {
        const user = await User.findById(req.user.id);
        if (!user) return done(null, false, { message: 'User not found.' });
        if (!user.facebookId) {
          user.facebookId = profile.id;
          await user.save();
          return done(null, user, { message: 'Facebook account linked.' });
        }
        return done(null, user, { message: 'Facebook already linked.' });
      }

      let user = await User.findOne({ facebookId: profile.id });
      if (user) return done(null, user);

      const email = profile.emails?.[0]?.value || null;
      if (email) {
        user = await User.findOne({ email });
        if (user && !user.facebookId) {
          user.facebookId = profile.id;
          await user.save();
          return done(null, user, { message: 'Facebook linked to existing email.' });
        }
      }

      const newUser = new User({
        facebookId: profile.id,
        email: email || `facebook_${profile.id}@noemail.com`,
        name: profile.displayName,
        profilePhotoUrl: profile.photos?.[0]?.value || null,
      });
      await newUser.save();
      return done(null, newUser);
    } catch (e) {
      return done(e);
    }
  }));

  // Twitter Strategy
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: '/auth/twitter/callback',
    includeEmail: true,
    passReqToCallback: true,
  }, async (req, token, tokenSecret, profile, done) => {
    try {
      if (req.user) {
        const user = await User.findById(req.user.id);
        if (!user) return done(null, false, { message: 'User not found.' });
        if (!user.twitterId) {
          user.twitterId = profile.id;
          await user.save();
          return done(null, user, { message: 'Twitter account linked.' });
        }
        return done(null, user, { message: 'Twitter already linked.' });
      }

      let user = await User.findOne({ twitterId: profile.id });
      if (user) return done(null, user);

      const email = profile.emails?.[0]?.value || null;

      const newUser = new User({
        twitterId: profile.id,
        email: email || `twitter_${profile.id}@noemail.com`,
        name: profile.displayName,
        profilePhotoUrl: profile.photos?.[0]?.value || null,
      });
      await newUser.save();
      return done(null, newUser);
    } catch (e) {
      return done(e);
    }
  }));

  // Serialize/Deserialize
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (e) { done(e); }
  });
};

module.exports = { configurePassport };
