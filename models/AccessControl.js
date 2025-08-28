const mongoose = require('mongoose');

const accessControlSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['granted', 'revoked', 'pending'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  grantedAt: Date
});

module.exports = mongoose.model('AccessControl', accessControlSchema);
