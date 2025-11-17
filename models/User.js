// ===================================================================
// FILE: models/User.js
// ===================================================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, trim: true },
  password:     { type: String }, // optional for social-only accounts
  name:         { type: String, trim: true },
  profilePhotoUrl: { type: String, trim: true },
  googleId:     { type: String, unique: true, sparse: true },
  facebookId:   { type: String, unique: true, sparse: true },
  twitterId:    { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['doctor', 'patient'], default: null },
}, { timestamps: true });

// Hash password if modified
userSchema.pre('save', async function(next) {
  try {
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('User', userSchema);



bhumika bhumika bhumika bhumika bhumika bhumika buumika bumika bhumika bhumika bumia bumima bhumika bhumika bhumika bhumika bhumika bhumika bhumika bhumika bhumika bhumik
