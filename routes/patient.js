// ===================================================================
// FILE: routes/patient.js (UPDATED WITH PAYMENT)
// ===================================================================

const express = require('express');
const crypto = require('crypto');
const { requireRole } = require('../middleware/auth');
const { upload } = require('../config/multer');
const MedicalRecord = require('../models/MedicalRecord');
const AccessControl = require('../models/AccessControl');
const User = require('../models/User');
const Appointment = require("../models/Appointment");
const Payment = require('../models/Payment');
const razorpay = require('../config/razorpay');
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

    // Fetch patient appointments
    const myAppointments = await Appointment.find({
      patientId: req.user._id
    })
    .populate("doctorId")
    .sort({ createdAt: -1 });

    // ⭐ NEW: Fetch payment history
    const paymentHistory = await Payment.find({
      patientId: req.user._id,
      status: 'completed'
    })
    .populate('doctorId')
    .populate('appointmentId')
    .sort({ createdAt: -1 })
    .limit(10);

    // res.render('patient/dashboard', {
    //   title: 'Patient Dashboard',
    //   records,
    //   doctors,
    //   accessList: safeAccessList,
    //   myAppointments,
    //   paymentHistory // Pass payment history to view
    // });

      res.render('patient/dashboard', {
      title: 'Patient Dashboard',
      user: req.user,
      records: records || [],
      doctors: doctors || [],
      accessList: accessList || [],
      myAppointments: myAppointments || [],
      paymentHistory: paymentHistory || [],
      messages: req.flash()
    });
  } catch (err) {
    console.error('Patient dashboard error:', err);
    req.flash('error', 'An error occurred loading the dashboard.');

    // res.render('patient/dashboard', {
    //   title: 'Patient Dashboard',
    //   records: [],
    //   doctors: [],
    //   accessList: [],
    //   myAppointments: [],
    //   paymentHistory: []
    // });
    res.render('patient/dashboard', {
      title: 'Patient Dashboard',
      user: req.user,
      records: [],
      doctors: [],
      accessList: [],
      myAppointments: [],
      paymentHistory: [],
      messages: { error: ['Failed to load dashboard'] }
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
  try {
    const doctor = await User.findById(req.params.doctorId);

    if (!doctor) {
      req.flash('error', 'Doctor not found.');
      return res.redirect('/patient/dashboard');
    }

    res.render("patient/bookAppointment", {
      title: "Book Appointment",
      doctor
    });
  } catch (err) {
    console.error('Book appointment page error:', err);
    req.flash('error', 'An error occurred.');
    res.redirect('/patient/dashboard');
  }
});


// =================== BOOK APPOINTMENT WITH PAYMENT ===================
router.post("/book-appointment/:doctorId", requireRole('patient'), async (req, res) => {
  try {
    const { date, time, reason } = req.body;
    const doctorId = req.params.doctorId;

    // Validate doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId: doctorId,
      date,
      time,
      reason: reason || '',
      consultationFee: 1, // ₹500 consultation fee
      paymentStatus: 'pending',
      status: 'pending'
    });

    // Create Razorpay order
    const amount = 1 * 100; // Convert to paise (500 INR = 50000 paise)
    const currency = 'INR';

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt: `appointment_${appointment._id}`,
      payment_capture: 1
    });

    // Create payment record
    const payment = await Payment.create({
      patientId: req.user._id,
      doctorId: doctorId,
      appointmentId: appointment._id,
      amount: 1,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      status: 'pending'
    });

    // Link payment to appointment
    appointment.paymentId = payment._id;
    await appointment.save();

    // Send order details to frontend
    res.json({
      success: true,
      order: razorpayOrder,
      appointmentId: appointment._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});


// ====================== VERIFY PAYMENT =============================
router.post("/verify-payment", requireRole('patient'), async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointmentId
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is verified

      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: 'completed'
        },
        { new: true }
      );

      // Update appointment payment status
      await Appointment.findByIdAndUpdate(appointmentId, {
        paymentStatus: 'completed'
      });

      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      // Invalid signature
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );

      await Appointment.findByIdAndUpdate(appointmentId, {
        paymentStatus: 'failed'
      });

      res.status(400).json({ success: false, message: 'Invalid signature' });
    }

  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});


// ==================== PAYMENT HISTORY PAGE ==========================
router.get("/payment-history", requireRole('patient'), async (req, res) => {
  try {
    const payments = await Payment.find({
      patientId: req.user._id
    })
    .populate('doctorId')
    .populate('appointmentId')
    .sort({ createdAt: -1 });

    res.render('patient/paymentHistory', {
      title: 'Payment History',
      payments
    });

  } catch (err) {
    console.error('Payment history error:', err);
    req.flash('error', 'An error occurred loading payment history.');
    res.redirect('/patient/dashboard');
  }
});

module.exports = router;