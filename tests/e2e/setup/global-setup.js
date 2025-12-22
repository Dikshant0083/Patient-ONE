// ===================================================================
// FILE: tests/e2e/setup/global-setup.js (NEW)
// ===================================================================
const { chromium } = require('@playwright/test');
const mongoose = require('mongoose');
require('dotenv').config();

async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db');

  const User = require('../../../models/User');
  const AccessControl = require('../../../models/AccessControl');

  // Create test patient
  const existingPatient = await User.findOne({ email: 'testpatient@example.com' });
  let patient;
  
  if (!existingPatient) {
    patient = await User.create({
      email: 'testpatient@example.com',
      password: 'password123',
      role: 'patient',
      name: 'Test Patient'
    });
    console.log('✅ Test patient created');
  } else {
    patient = existingPatient;
    console.log('✅ Test patient already exists');
  }

  // Create test doctor
  const existingDoctor = await User.findOne({ email: 'testdoctor@example.com' });
  let doctor;
  
  if (!existingDoctor) {
    doctor = await User.create({
      email: 'testdoctor@example.com',
      password: 'password123',
      role: 'doctor',
      name: 'Dr. Test'
    });
    console.log('✅ Test doctor created');
  } else {
    doctor = existingDoctor;
    console.log('✅ Test doctor already exists');
  }

  // Grant access from patient to doctor
  const existingAccess = await AccessControl.findOne({
    patientId: patient._id,
    doctorId: doctor._id
  });

  if (!existingAccess) {
    await AccessControl.create({
      patientId: patient._id,
      doctorId: doctor._id,
      status: 'granted',
      grantedAt: new Date()
    });
    console.log('✅ Access granted between patient and doctor');
  } else if (existingAccess.status !== 'granted') {
    existingAccess.status = 'granted';
    existingAccess.grantedAt = new Date();
    await existingAccess.save();
    console.log('✅ Access updated to granted');
  } else {
    console.log('✅ Access already granted');
  }

  await mongoose.disconnect();
  console.log('✅ Test setup complete!\n');
}

module.exports = globalSetup;