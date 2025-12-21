// ===================================================================
// FILE: routes/auth.js
// ===================================================================
const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// -------------------------------------------------------------------
// Register routes
// -------------------------------------------------------------------
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, confirm_password, role } = req.body;

    if (!email || !password || !role) {
      req.flash('error', 'Email, password, and role are required.');
      return res.redirect('/auth/register');
    }
    if (!['doctor', 'patient'].includes(role)) {
      req.flash('error', 'Invalid role selected.');
      return res.redirect('/auth/register');
    }
    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/auth/register');
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect('/auth/register');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      req.flash('error', 'Email already registered.');
      return res.redirect('/auth/register');
    }

    const user = new User({ email, password, role });
    await user.save();

    req.flash('success', 'Registration successful! Please sign in.');
    res.redirect('/auth/login');
  } catch (e) {
    console.error('Registration error:', e);
    next(e);
  }
});

// -------------------------------------------------------------------
// Login routes
// -------------------------------------------------------------------

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info.message || 'Invalid email or password.');
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);

      // Redirect based on role

      if (user.role === 'doctor') {
        return res.redirect('/doctor/dashboard');
      } else if (user.role === 'patient') {
        return res.redirect('/patient/dashboard');
      } else {
        return res.redirect('/profile');
      }
    });
  })(req, res, next);
});

// -------------------------------------------------------------------
// Logout
// -------------------------------------------------------------------


router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'You have been logged out.');
    res.redirect('/auth/login');
  });
});

// -------------------------------------------------------------------
// Role selection routes (used for first-time Google login)
// -------------------------------------------------------------------
router.get('/select-role', (req, res) => {
  if (!req.user) {
    return res.redirect('/auth/login');
  }
 res.render('select-role', { title: 'Select Role' });
});

router.post('/select-role', async (req, res) => {
  const { role } = req.body; // "doctor" or "patient"
  if (!['doctor', 'patient'].includes(role)) {
    return res.status(400).send('Invalid role');
  }

  req.user.role = role;
  await req.user.save();

  if (role === 'doctor') {
    return res.redirect('/doctor/dashboard');
  } else {
    return res.redirect('/patient/dashboard');
  }
});

// -------------------------------------------------------------------
// Social auth routes
// -------------------------------------------------------------------

// Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login', failureFlash: true }),
  (req, res) => {
    if (!req.user.role) {
      req.flash('info', 'Please select your role to continue.');
      return res.redirect('/auth/select-role'); // ✅ fixed
    }

    // already has role -> go to dashboard/profile
    if (req.user.role === 'doctor') {
      return res.redirect('/doctor/dashboard');
    } else if (req.user.role === 'patient') {
      return res.redirect('/patient/dashboard');
    } else {
      return res.redirect('/profile');
    }
  }
);

// // Facebook
// router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
// router.get('/facebook/callback',
//   passport.authenticate('facebook', { failureRedirect: '/auth/login', failureFlash: true }),
//   (req, res) => {
//     req.flash('success', (req.authInfo && req.authInfo.message) || 'Logged in with Facebook.');
//     res.redirect('/profile');
//   }
// );

// // Twitter
// router.get('/twitter', passport.authenticate('twitter'));
// router.get('/twitter/callback',
//   passport.authenticate('twitter', { failureRedirect: '/auth/login', failureFlash: true }),
//   (req, res) => {
//     req.flash('success', (req.authInfo && req.authInfo.message) || 'Logged in with Twitter.');
//     res.redirect('/profile');
//   }
// );

module.exports = router;
