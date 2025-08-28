
// ===================================================================
// FILE: utils/errorHandler.js
// ===================================================================
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  req.flash('error', 'Something went wrong. Please try again.');
  const back = req.headers.referer || '/';
  res.status(500).redirect(back);
};

module.exports = { errorHandler };