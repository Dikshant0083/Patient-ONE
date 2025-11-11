// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  roomId: { type: String, required: true, index: true }, // new
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
});

module.exports = mongoose.model('Message', messageSchema);
