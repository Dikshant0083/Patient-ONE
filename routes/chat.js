// ===================================================================
// FILE: routes/chat.js
// ===================================================================
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { isAuthenticated, requireRole } = require('../middleware/auth');
const { generateRoomId } = require('../utils/chatRoom');

// Get chat messages between patient and doctor
router.get('/patient/:doctorId', isAuthenticated, requireRole('patient'), async (req, res) => {
  try {
    const userId = req.user._id;
    const doctorId = req.params.doctorId;
    const roomId = generateRoomId(userId, doctorId);

    const messages = await Message.find({ roomId }).sort({ createdAt: 1 });

    const doctor = await User.findById(doctorId);
    if (!doctor) return res.status(404).send('Doctor not found');

    res.render('chat', {
      messages,
      chatWith: doctor,
      roomId,
      user: req.user,
      title: `Chat with Dr. ${doctor.name || doctor.email}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
// Get chat messages between doctor and patient
router.get('/doctor/:patientId', isAuthenticated, requireRole('doctor'), async (req, res) => {
  try {
    const userId = req.user._id;
    const patientId = req.params.patientId;
    const roomId = generateRoomId(userId, patientId);

    const messages = await Message.find({ roomId }).sort({ createdAt: 1 });

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).send('Patient not found');

    res.render('chat', {
      messages,
      chatWith: patient,
      roomId,
      user: req.user,
      title: `Chat with ${patient.name || patient.email}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


module.exports = router;
