
// ===================================================================
// FILE: routes/records.js (UPDATED TO USE CORRECT TEMPLATE)
// ===================================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const { isAuthenticated, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const AccessControl = require('../models/AccessControl');
const router = express.Router();

// Serve uploaded files - with proper access control
router.get('/:filename', isAuthenticated, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/uploads', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Find the medical record that contains this file
    const record = await MedicalRecord.findOne({ 
      fileUrl: `/records/${req.params.filename}` 
    });

    if (!record) {
      return res.status(404).send('Record not found');
    }

    // Check access permissions
    if (req.user.role === 'patient') {
      // Patients can only view their own records
      if (record.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).send('Access denied');
      }
    } else if (req.user.role === 'doctor') {
      // Doctors can only view records if they have granted access
      const accessControl = await AccessControl.findOne({
        patientId: record.patientId,
        doctorId: req.user._id,
        status: 'granted'
      });

      if (!accessControl) {
        return res.status(403).send('Access denied - No permission to view this patient\'s records');
      }
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Server error');
  }
});

// View patient records - FIXED VERSION
router.get('/patient/:patientId', isAuthenticated, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check if the requesting user has permission to view these records
    if (req.user.role === 'patient') {
      // Patients can only view their own records
      if (patientId !== req.user._id.toString()) {
        req.flash('error', 'You can only view your own records.');
        return res.redirect('/patient/dashboard');
      }
    } else if (req.user.role === 'doctor') {
      // Check if doctor has granted access
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

    // Fetch patient and their records
    const patient = await User.findById(patientId);
    if (!patient) {
      req.flash('error', 'Patient not found.');
      return res.redirect(req.user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    }

    const records = await MedicalRecord.find({ patientId: patientId });

    // FIXED: Use the correct template name
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

module.exports = router;
