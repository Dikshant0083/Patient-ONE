// ===================================================================
// FILE: routes/records.js (FULLY FIXED VERSION)
// ===================================================================
const express = require('express');
const path = require('path');
const fs = require('fs');

const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const AccessControl = require('../models/AccessControl');
const redis = require('../config/redis');

const router = express.Router();

// ================================================================
// VIEW ALL PATIENT RECORDS
// ================================================================
router.get('/patient/:patientId', isAuthenticated, async (req, res) => {
  try {
    const { patientId } = req.params;

    // PERMISSION CHECKS
    if (req.user.role === 'patient') {
      if (patientId !== req.user._id.toString()) {
        req.flash('error', 'You can only view your own records.');
        return res.redirect('/patient/dashboard');
      }
    } else if (req.user.role === 'doctor') {
      const accessControl = await AccessControl.findOne({
        patientId,
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

    // REDIS CACHE CHECK
    const cacheKey = `records:${patientId}`;
    const cachedRecords = await redis.get(cacheKey);

    if (cachedRecords) {
      const patient = await User.findById(patientId);
      return res.render('viewRecords', {
        title: `Medical Records - ${patient.name || patient.email}`,
        patient,
        records: JSON.parse(cachedRecords),
        isDoctor: req.user.role === 'doctor'
      });
    }

    // FETCH FROM MONGO
    const patient = await User.findById(patientId);
    if (!patient) {
      req.flash('error', 'Patient not found.');
      return res.redirect('/patient/dashboard');
    }

    const records = await MedicalRecord.find({ patientId });

    // SAVE TO REDIS CACHE
    await redis.set(cacheKey, JSON.stringify(records), { EX: 300 });

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
// DELETE RECORD (MUST BE ABOVE /:filename ROUTE)
// ================================================================
router.get('/delete/:recordId', isAuthenticated, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.recordId);

    if (!record) {
      req.flash('error', 'Record not found.');
      return res.redirect('/patient/dashboard');
    }

    // Only owner can delete
    if (record.patientId.toString() !== req.user._id.toString()) {
      req.flash('error', 'Unauthorized action.');
      return res.redirect('/patient/dashboard');
    }

    // DELETE FILE
    const filePath = path.join(__dirname, '../public', record.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // DELETE DB ENTRY
    await MedicalRecord.findByIdAndDelete(record._id);

    // CLEAR REDIS CACHE
    await redis.del(`records:${req.user._id}`);

    req.flash('success', 'Record deleted successfully.');
    res.redirect('/patient/dashboard');

  } catch (err) {
    console.error('Delete error:', err);
    req.flash('error', 'Error deleting the record.');
    res.redirect('/patient/dashboard');
  }
});


// ================================================================
// SERVE FILES (KEEP THIS ROUTE LAST!)
// ================================================================
router.get('/:filename', isAuthenticated, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/uploads', req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const record = await MedicalRecord.findOne({
      fileUrl: `/uploads/${req.params.filename}`
    });

    if (!record) return res.status(404).send('Record not found');

    // Access checks
    if (req.user.role === 'patient' && record.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).send('Access denied');
    }

    if (req.user.role === 'doctor') {
      const accessControl = await AccessControl.findOne({
        patientId: record.patientId,
        doctorId: req.user._id,
        status: 'granted'
      });

      if (!accessControl) return res.status(403).send('Access denied');
    }

    res.sendFile(filePath);

  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Server error');
  }
});


module.exports = router;
