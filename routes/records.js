// ===================================================================
// FILE: routes/records.js (FIXED VERSION)
// ===================================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const AccessControl = require('../models/AccessControl');
const router = express.Router();

// ================================================================
// View patient records (must come FIRST to avoid route conflict)
// ================================================================
router.get('/patient/:patientId', isAuthenticated, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check permissions
    if (req.user.role === 'patient') {
      if (patientId !== req.user._id.toString()) {
        req.flash('error', 'You can only view your own records.');
        return res.redirect('/patient/dashboard');
      }
    } else if (req.user.role === 'doctor') {
      const accessControl = await AccessControl.findOne({
        patientId: patientId,
        doctorId: req.user._id,
        status: 'granted'
      });

      if (!accessControl) {
        req.flash('error', 'You do not have permission to view this patient\'s records.');
        return res.redirect('/doctor/dashboard');
      }
    } else {
      req.flash('error', 'Access denied.');
      return res.redirect('/');
    }

    // Fetch patient + their records
    const patient = await User.findById(patientId);
    if (!patient) {
      req.flash('error', 'Patient not found.');
      return res.redirect(req.user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    }

    const records = await MedicalRecord.find({ patientId: patientId });

    // Render template with patient records
    res.render('viewRecords', { 
      title: `Medical Records - ${patient.name || patient.email}`,
      patient, 
      records,
      isDoctor: req.user.role === 'doctor'
    });
  } catch (err) {
    console.error('Error viewing records:', err);
    req.flash('error', 'An error occurred while loading records.');
    res.redirect('/');
  }
});

// ================================================================
// Serve uploaded files - placed AFTER patient route
// ================================================================
router.get('/:filename', isAuthenticated, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/uploads', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Match the way you saved fileUrl in MedicalRecord
    const record = await MedicalRecord.findOne({ 
      fileUrl: `/uploads/${req.params.filename}`   // ✅ FIXED to match uploads folder
    });

    if (!record) {
      return res.status(404).send('Record not found');
    }

    // Check access
    if (req.user.role === 'patient') {
      if (record.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).send('Access denied');
      }
    } else if (req.user.role === 'doctor') {
      const accessControl = await AccessControl.findOne({
        patientId: record.patientId,
        doctorId: req.user._id,
        status: 'granted'
      });

      if (!accessControl) {
        return res.status(403).send('Access denied - No permission to view this patient\'s records');
      }
    }

    // Serve file
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
