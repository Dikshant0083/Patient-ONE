
// ===================================================================
// FILE: routes/doctor.js (UPDATED VERSION)
// ===================================================================
const express = require('express');
const { requireRole } = require('../middleware/auth');
const AccessControl = require('../models/AccessControl');
const User = require('../models/User');
const router = express.Router();
const Appointment = require("../models/Appointment");

// Doctor dashboard
router.get('/dashboard', requireRole('doctor'), async (req, res) => {
  try {
    const accessList = await AccessControl.find({ 
      doctorId: req.user._id, 
      status: 'granted' 
    }).populate('patientId');

    // Also get pending requests
    const pendingRequests = await AccessControl.find({ 
      doctorId: req.user._id, 
      status: 'pending' 
    }).populate('patientId');

    // Get all patients for making new requests
    const allPatients = await User.find({ role: 'patient' });

    res.render('doctor/dashboard', { 
      title: 'Doctor Dashboard', 
      accessList,
      pendingRequests,
      allPatients
    });
  } catch (err) {
    console.error('Doctor dashboard error:', err);
    req.flash('error', 'An error occurred loading the dashboard.');
    res.redirect('/');
  }
});

// Request access to patient records
router.post('/request/:patientId', requireRole('doctor'), async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check if patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      req.flash('error', 'Patient not found.');
      return res.redirect('/doctor/dashboard');
    }

    // Check if request already exists
    const existingRequest = await AccessControl.findOne({
      patientId: patientId,
      doctorId: req.user._id
    });

    if (existingRequest) {
      if (existingRequest.status === 'granted') {
        req.flash('error', 'You already have access to this patient\'s records.');
      } else if (existingRequest.status === 'pending') {
        req.flash('error', 'Access request already pending.');
      } else {
        // Update revoked status to pending
        existingRequest.status = 'pending';
        await existingRequest.save();
        req.flash('success', 'Access request sent.');
      }
    } else {
      // Create new request
      await AccessControl.create({
        patientId: patientId,
        doctorId: req.user._id,
        status: 'pending'
      });
      req.flash('success', 'Access request sent to patient.');
    }

    res.redirect('/doctor/dashboard');
  } catch (err) {
    console.error('Request access error:', err);
    req.flash('error', 'An error occurred while requesting access.');
    res.redirect('/doctor/dashboard');
  }
});

// View patient records (redirect to records route)
router.get('/view-records/:patientId', requireRole('doctor'), (req, res) => {
  res.redirect(`/records/patient/${req.params.patientId}`);
});

//Appointment management
// Show doctor appointments
router.get("/appointments", requireRole('doctor'), async (req, res) => {
    const appointments = await Appointment.find({ doctorId: req.user._id })
        .populate("patientId")
        .sort({ createdAt: -1 });

res.render("doctor/appointments", { 
    title: "Doctor Appointments",
    appointments 
});
    
});
router.get("/appointment/:id/approve", async (req, res) => {
  await Appointment.findByIdAndUpdate(req.params.id, { status: "approved" });
  res.redirect("/doctor/appointments");
});

router.get("/appointment/:id/reject", async (req, res) => {
  await Appointment.findByIdAndUpdate(req.params.id, { status: "rejected" });
  res.redirect("/doctor/appointments");
});


module.exports = router;