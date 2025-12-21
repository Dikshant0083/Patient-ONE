const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  date: { type: String, required: true },   // e.g. 2025-02-20
  time: { type: String, required: true },   // e.g. 10:30 AM

  reason: { type: String, default: "" },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
