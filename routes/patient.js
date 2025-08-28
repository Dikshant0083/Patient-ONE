// ===================================================================
// FILE: routes/patient.js (FULLY FIXED VERSION WITH DEBUGGING)
// ===================================================================
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { upload } = require('../config/multer');
const MedicalRecord = require('../models/MedicalRecord');
const AccessControl = require('../models/AccessControl');
const User = require('../models/User');
const router = express.Router();

// Patient dashboard - FIXED with proper debugging
router.get('/dashboard', requireRole('patient'), async (req, res) => {
  try {
    console.log('Patient ID:', req.user._id); // Debug log
    
    const records = await MedicalRecord.find({ patientId: req.user._id });
    console.log('Found records:', records.length); // Debug log
    
    const doctors = await User.find({ role: 'doctor' });
    console.log('Found doctors:', doctors.length); // Debug log
    
    // IMPORTANT: Make sure accessList is properly fetched and not undefined
    const accessList = await AccessControl.find({ 
      patientId: req.user._id 
    }).populate('doctorId');
    
    console.log('AccessList:', accessList); // Debug log
    
    // Ensure accessList is never undefined - provide empty array as fallback
    const safeAccessList = accessList || [];

    res.render('patient/dashboard', { 
      title: 'Patient Dashboard', 
      records: records || [], 
      doctors: doctors || [], 
      accessList: safeAccessList  // Use safe version
    });
  } catch (err) {
    console.error('Patient dashboard error:', err);
    req.flash('error', 'An error occurred loading the dashboard.');
    
    // Render with empty arrays to prevent undefined errors
    res.render('patient/dashboard', { 
      title: 'Patient Dashboard', 
      records: [], 
      doctors: [], 
      accessList: []
    });
  }
});

// Upload record
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
      fileUrl: `/records/${req.file.filename}`
    });

    req.flash('success', 'Medical record uploaded successfully.');
    res.redirect('/patient/dashboard');
  } catch (err) {
    console.error('Upload error:', err);
    req.flash('error', 'An error occurred while uploading the record.');
    res.redirect('/patient/dashboard');
  }
});

// Grant access to doctor
router.get('/access/:doctorId/grant', requireRole('patient'), async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      req.flash('error', 'Doctor not found.');
      return res.redirect('/patient/dashboard');
    }

    await AccessControl.findOneAndUpdate(
      { patientId: req.user._id, doctorId: doctorId },
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

// Revoke access from doctor
router.get('/access/:doctorId/revoke', requireRole('patient'), async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findById(doctorId);
    await AccessControl.findOneAndUpdate(
      { patientId: req.user._id, doctorId: doctorId },
      { status: 'revoked' }
    );

    req.flash('success', `Access revoked from Dr. ${doctor?.name || doctor?.email || 'Doctor'}.`);
    res.redirect('/patient/dashboard');
  } catch (err) {
    console.error('Revoke access error:', err);
    req.flash('error', 'An error occurred while revoking access.');
    res.redirect('/patient/dashboard');
  }
});

module.exports = router;

