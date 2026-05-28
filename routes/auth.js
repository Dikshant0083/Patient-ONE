const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { getFirebaseAdminAuth } = require('../config/firebaseAdmin');
const { getFirebaseClientConfig } = require('../config/firebaseClient');

const router = express.Router();

const wantsJson = (req) =>
  req.xhr ||
  req.is('application/json') ||
  (req.get('accept') || '').includes('application/json');

const sendError = (req, res, redirectPath, message, status = 400) => {
  if (wantsJson(req)) {
    return res.status(status).json({ error: message });
  }

  req.flash('error', message);
  return res.redirect(redirectPath);
};

const sendRedirect = (req, res, redirectUrl) => {
  if (wantsJson(req)) {
    return res.json({ redirectUrl });
  }

  return res.redirect(redirectUrl);
};

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const getRedirectForUser = (user) => {
  if (!user.role) {
    return '/auth/select-role';
  }

  if (user.role === 'doctor') {
    return '/doctor/dashboard';
  }

  if (user.role === 'patient') {
    return '/patient/dashboard';
  }

  return '/profile';
};

const syncUserFromFirebase = async (decodedToken, options = {}) => {
  const { role = null, createIfMissing = true } = options;
  const provider = decodedToken.firebase?.sign_in_provider || 'unknown';
  const email = normalizeEmail(decodedToken.email);

  if (!email) {
    throw new Error('Your Firebase account is missing an email address.');
  }

  let user = await User.findOne({ firebaseUid: decodedToken.uid });

  if (!user) {
    user = await User.findOne({ email });
  }

  if (!user) {
    if (!createIfMissing) {
      throw new Error('No account found for this Google email. Please register with Google first.');
    }

    user = new User({
      email,
      role: role || null,
    });
  }

  if (user.firebaseUid && user.firebaseUid !== decodedToken.uid) {
    throw new Error('This email is already linked to another Firebase account.');
  }

  user.firebaseUid = decodedToken.uid;
  user.email = email;
  user.emailVerified = Boolean(decodedToken.email_verified);
  user.lastLoginProvider = 'google';
  user.lastLoginAt = new Date();

  if (decodedToken.name && (!user.name || provider === 'google.com')) {
    user.name = decodedToken.name;
  }

  if (decodedToken.picture && (!user.profilePhotoUrl || provider === 'google.com')) {
    user.profilePhotoUrl = decodedToken.picture;
  }

  if (provider === 'google.com') {
    user.googleId = decodedToken.uid;
  }

  if (role && !user.role) {
    user.role = role;
  }

  await user.save();
  return user;
};

const completeLogin = (req, res, next, user) => {
  req.logIn(user, (error) => {
    if (error) {
      return next(error);
    }

    return sendRedirect(req, res, getRedirectForUser(user));
  });
};

router.get('/register', (req, res) => {
  res.render('register', {
    title: 'Register',
    firebaseClientConfig: getFirebaseClientConfig(),
  });
});

router.post('/register', async (req, res, next) => {
  try {
    const { idToken, email, password, confirm_password, role } = req.body;

    if (!['doctor', 'patient'].includes(role)) {
      return sendError(req, res, '/auth/register', 'Please choose either doctor or patient.');
    }

    if (idToken) {
      const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);
      const user = await syncUserFromFirebase(decodedToken, { role, createIfMissing: true });
      return completeLogin(req, res, next, user);
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return sendError(req, res, '/auth/register', 'Email, password, and role are required.');
    }

    if (password !== confirm_password) {
      return sendError(req, res, '/auth/register', 'Passwords do not match.');
    }

    if (password.length < 6) {
      return sendError(req, res, '/auth/register', 'Password must be at least 6 characters.');
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return sendError(req, res, '/auth/register', 'Email already registered. Please sign in instead.');
    }

    const user = new User({
      email: normalizedEmail,
      password,
      role,
    });

    await user.save();
    req.flash('success', 'Registration successful! Please sign in.');
    return res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(req, res, '/auth/register', error.message || 'Unable to complete registration.', 401);
  }
});

router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    firebaseClientConfig: getFirebaseClientConfig(),
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const { idToken, email, password } = req.body;

    if (idToken) {
      const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);
      const user = await syncUserFromFirebase(decodedToken, { createIfMissing: false });
      return completeLogin(req, res, next, user);
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      return sendError(req, res, '/auth/login', 'Email and password are required.');
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      const message = user && user.googleId
        ? 'This account uses Google sign-in. Please continue with Google.'
        : 'Invalid email or password.';
      return sendError(req, res, '/auth/login', message, 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return sendError(req, res, '/auth/login', 'Invalid email or password.', 401);
    }

    user.lastLoginProvider = 'local';
    user.lastLoginAt = new Date();
    await user.save();

    return completeLogin(req, res, next, user);
  } catch (error) {
    console.error('Login error:', error);
    return sendError(req, res, '/auth/login', error.message || 'Unable to sign in.', 401);
  }
});

router.get('/logout', (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    req.flash('success', 'You have been logged out.');
    return res.redirect('/auth/login');
  });
});

router.get('/select-role', (req, res) => {
  if (!req.user) {
    return res.redirect('/auth/login');
  }

  return res.render('select-role', { title: 'Select Role' });
});

router.post('/select-role', async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!req.user) {
      return res.redirect('/auth/login');
    }

    if (!['doctor', 'patient'].includes(role)) {
      return sendError(req, res, '/auth/select-role', 'Please choose either doctor or patient.');
    }

    req.user.role = role;
    await req.user.save();

    return res.redirect(getRedirectForUser(req.user));
  } catch (error) {
    return next(error);
  }
});

router.get('/google', (req, res) => {
  req.flash('error', 'Google sign-in now runs through Firebase. Please use the Google button on the login or register page.');
  res.redirect('/auth/login');
});

router.get('/google/callback', (req, res) => {
  req.flash('error', 'Google sign-in now runs through Firebase. Please use the Google button on the login or register page.');
  res.redirect('/auth/login');
});

module.exports = router;
