// ===================================================================
// FILE: middleware/auth.js
// ===================================================================

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  req.flash('error', 'Please log in to view that page.');
  res.redirect('/auth/login');
};

const requireRole = (role) => {
  return (req, res, next) => {
    // First check if user is authenticated
    if (!req.isAuthenticated()) {
      req.flash('error', 'Please log in to view that page.');
      return res.redirect('/auth/login');
    }

    // Check if user has the required role
    if (req.user && req.user.role === role) {
      return next();
    }

    // If authenticated but wrong role, redirect to their correct dashboard
    req.flash('error', 'Access denied. You do not have permission to access that page.');
    
    if (req.user && req.user.role === 'doctor') {
      return res.redirect('/doctor/dashboard');
    } else if (req.user && req.user.role === 'patient') {
      return res.redirect('/patient/dashboard');
    } else {
      return res.redirect('/profile');
    }
  };
};

module.exports = { isAuthenticated, requireRole };