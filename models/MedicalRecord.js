const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    description: String,
    fileUrl: String
  },
  {
    timestamps: true   // ✅ THIS enables createdAt & updatedAt
  }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
