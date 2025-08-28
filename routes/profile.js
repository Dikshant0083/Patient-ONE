
// ===================================================================
// FILE: routes/profile.js
// ===================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Profile page
router.get('/', isAuthenticated, (req, res) => {
  res.render('profile', { title: 'Your Profile' });
});

// Update profile
router.post('/update', isAuthenticated, async (req, res, next) => {
  try {
    const { name, profilePhotoUrl } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/profile');
    }
    if (typeof name === 'string') user.name = name.trim();
    if (typeof profilePhotoUrl === 'string') user.profilePhotoUrl = profilePhotoUrl.trim();
    await user.save();
    req.flash('success', 'Profile updated successfully!');
    res.redirect('/profile');
  } catch (e) {
    console.error('Profile update error:', e);
    next(e);
  }
});

// Change password
router.post('/password', isAuthenticated, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/profile');
    }

    if (!user.password) {
      req.flash('error', 'You signed up with social login. Set a password via support first.');
      return res.redirect('/profile');
    }

    if (newPassword !== confirmNewPassword) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/profile');
    }
    if ((newPassword || '').length < 6) {
      req.flash('error', 'New password must be at least 6 characters.');
      return res.redirect('/profile');
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      req.flash('error', 'Incorrect current password.');
      return res.redirect('/profile');
    }

    user.password = newPassword;
    await user.save();
    req.flash('success', 'Password changed successfully!');
    res.redirect('/profile');
  } catch (e) {
    console.error('Password change error:', e);
    next(e);
  }
});

// Disconnect social accounts
router.post('/disconnect-social/:provider', isAuthenticated, async (req, res, next) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/profile');
    }

    if (provider === 'google') user.googleId = undefined;
    else if (provider === 'facebook') user.facebookId = undefined;
    else if (provider === 'twitter') user.twitterId = undefined;
    else {
      req.flash('error', 'Invalid social provider.');
      return res.redirect('/profile');
    }

    if (!user.password && !user.googleId && !user.facebookId && !user.twitterId) {
      req.flash('error', 'Cannot disconnect the last login method. Please set a password or connect another account first.');
      return res.redirect('/profile');
    }

    await user.save();
    req.flash('success', `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected.`);
    res.redirect('/profile');
  } catch (e) {
    console.error('Disconnect social error:', e);
    next(e);
  }
});

// Delete account
router.post('/delete', isAuthenticated, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    req.logout((err) => {
      if (err) return next(err);
      req.flash('success', 'Your account has been deleted.');
      res.redirect('/auth/register');
    });
  } catch (e) {
    console.error('Account deletion error:', e);
    next(e);
  }
});

module.exports = router;
