// ===================================================================
// FILE: tests/helpers/testHelpers.js
// ===================================================================

const request = require('supertest');
const User = require('../../models/User');

/**
 * Create a test user
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    email: 'test@example.com',
    password: 'password123',
    role: 'patient',
    name: 'Test User',
    ...userData
  };

  const user = new User(defaultUser);
  await user.save();
  return user;
}

/**
 * Create a test doctor
 */
async function createTestDoctor(userData = {}) {
  return createTestUser({
    email: 'doctor@example.com',
    role: 'doctor',
    name: 'Dr. Test',
    ...userData
  });
}

/**
 * Login and get authenticated agent
 */
async function loginUser(app, email, password) {
  const agent = request.agent(app);

  await agent
    .post('/auth/login')
    .send({ email, password })
    .expect(302);

  return agent;
}

/**
 * Create authenticated test patient
 */
async function createAuthenticatedPatient(app) {
  const patient = await createTestUser({
    email: 'patient@test.com',
    password: 'password123',
    role: 'patient',
    name: 'Test User'
  });

  const agent = await loginUser(app, 'patient@test.com', 'password123');
  return { patient, agent };
}

/**
 * Create authenticated test doctor
 */
async function createAuthenticatedDoctor(app) {
  const doctor = await createTestDoctor({
    email: 'doctor@test.com',
    password: 'password123',
    name: 'Dr. Test'
  });

  const agent = await loginUser(app, 'doctor@test.com', 'password123');
  return { doctor, agent };
}

module.exports = {
  createTestUser,
  createTestDoctor,
  loginUser,
  createAuthenticatedPatient,
  createAuthenticatedDoctor
};
