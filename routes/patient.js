// ===================================================================
// FILE: routes/patient.js (FINAL CORRECTED VERSION)
// ===================================================================

const express = require('express');
const { requireRole } = require('../middleware/auth');
const { upload } = require('../config/multer');
const MedicalRecord = require('../models/MedicalRecord');
const AccessControl = require('../models/AccessControl');
const User = require('../models/User');
const Appointment = require("../models/Appointment");
const router = express.Router();


// ====================== PATIENT DASHBOARD ==========================
router.get('/dashboard', requireRole('patient'), async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user._id });
    const doctors = await User.find({ role: 'doctor' });

    const accessList = await AccessControl.find({
      patientId: req.user._id
    }).populate('doctorId');

    const safeAccessList = accessList || [];

    // ⭐ Fetch patient appointments
    const myAppointments = await Appointment.find({
      patientId: req.user._id
    })
    .populate("doctorId")
    .sort({ createdAt: -1 });

    res.render('patient/dashboard', {
      title: 'Patient Dashboard',
      records,
      doctors,
      accessList: safeAccessList,
      myAppointments
    });

  } catch (err) {
    console.error('Patient dashboard error:', err);
    req.flash('error', 'An error occurred loading the dashboard.');

    res.render('patient/dashboard', {
      title: 'Patient Dashboard',
      records: [],
      doctors: [],
      accessList: [],
      myAppointments: []
    });
  }
});


// ===================== UPLOAD MEDICAL RECORD ========================
router.post('/upload', requireRole('patient'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error', 'Please select a file to upload.');
      return res.redirect('/patient/dashboard');
    }

    await MedicalRecord.create({
      patientId: req.user._id,
      title: req.body.title || 'Medical Record',
      description: req.body.description || '',
      fileUrl: `/uploads/${req.file.filename}`
    });

    req.flash('success', 'Medical record uploaded successfully.');
    res.redirect('/patient/dashboard');

  } catch (err) {
    console.error('Upload error:', err);
    req.flash('error', 'An error occurred while uploading the record.');
    res.redirect('/patient/dashboard');
  }
});


// ======================== GRANT ACCESS =============================
router.get('/access/:doctorId/grant', requireRole('patient'), async (req, res) => {
  try {
    const doctor = await User.findById(req.params.doctorId);

    if (!doctor || doctor.role !== 'doctor') {
      req.flash('error', 'Doctor not found.');
      return res.redirect('/patient/dashboard');
    }

    await AccessControl.findOneAndUpdate(
      { patientId: req.user._id, doctorId: req.params.doctorId },
      { status: 'granted', grantedAt: new Date() },
      { upsert: true }
    );

    req.flash('success', `Access granted to Dr. ${doctor.name || doctor.email}.`);
    res.redirect('/patient/dashboard');

  } catch (err) {
    console.error('Grant access error:', err);
    req.flash('error', 'An error occurred while granting access.');
    res.redirect('/patient/dashboard');
  }
});


// ======================== REVOKE ACCESS =============================
router.get('/access/:doctorId/revoke', requireRole('patient'), async (req, res) => {
  try {
    await AccessControl.findOneAndUpdate(
      { patientId: req.user._id, doctorId: req.params.doctorId },
      { status: 'revoked' }
    );

    req.flash('success', `Access revoked successfully.`);
    res.redirect('/patient/dashboard');

  } catch (err) {
    console.error('Revoke access error:', err);
    req.flash('error', 'An error occurred while revoking access.');
    res.redirect('/patient/dashboard');
  }
});


// ===================== BOOK APPOINTMENT FORM ========================
router.get("/book-appointment/:doctorId", requireRole('patient'), async (req, res) => {
  const doctor = await User.findById(req.params.doctorId);

  res.render("patient/bookAppointment", {
    title: "Book Appointment",
    doctor
  });
});


// ====================== BOOK APPOINTMENT POST ======================
router.post("/book-appointment/:doctorId", requireRole('patient'), async (req, res) => {
  const { date, time, reason } = req.body;

  await Appointment.create({
    patientId: req.user._id,
    doctorId: req.params.doctorId,
    date,
    time,
    reason
  });

  req.flash("success", "Appointment request sent.");
  res.redirect("/patient/dashboard");
});

module.exports = router;
