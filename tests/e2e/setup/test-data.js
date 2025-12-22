
// ===================================================================
// FILE: tests/e2e/setup/test-data.js (NEW)
// ===================================================================
// Helper to create test data

async function ensureTestData() {
  const User = require('../../../models/User');
  const AccessControl = require('../../../models/AccessControl');

  // Create patient
  let patient = await User.findOne({ email: 'testpatient@example.com' });
  if (!patient) {
    patient = await User.create({
      email: 'testpatient@example.com',
      password: 'password123',
      role: 'patient',
      name: 'Test Patient'
    });
  }

  // Create doctor
  let doctor = await User.findOne({ email: 'testdoctor@example.com' });
  if (!doctor) {
    doctor = await User.create({
      email: 'testdoctor@example.com',
      password: 'password123',
      role: 'doctor',
      name: 'Dr. Test'
    });
  }

  // Grant access
  let access = await AccessControl.findOne({
    patientId: patient._id,
    doctorId: doctor._id
  });

  if (!access) {
    access = await AccessControl.create({
      patientId: patient._id,
      doctorId: doctor._id,
      status: 'granted',
      grantedAt: new Date()
    });
  } else if (access.status !== 'granted') {
    access.status = 'granted';
    access.grantedAt = new Date();
    await access.save();
  }

  return { patient, doctor, access };
}

module.exports = { ensureTestData };