// ===================================================================
// FILE: config/database.js
// ===================================================================
const mongoose = require('mongoose');

const connectDatabase = () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myauth';

  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      process.exit(1);
    });
};

module.exports = { connectDatabase };
