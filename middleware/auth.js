
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
    if (req.isAuthenticated() && req.user.role === role) return next();
    req.flash('error', 'Access denied.');
    res.redirect('/auth/login');
  };
};

module.exports = { isAuthenticated, requireRole };