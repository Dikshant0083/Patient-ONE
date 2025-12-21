// ===================================================================
// FILE: tests/__tests__/auth.test.js
// ===================================================================
const request = require('supertest');
const app = require('../../app'); // Your main Express app
const User = require('../../models/User');
const { createTestUser } = require('../helpers/testHelpers');

describe('Authentication Routes', () => {
  
  describe('POST /auth/register', () => {
    it('should register a new patient successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newpatient@test.com',
          password: 'password123',
          confirm_password: 'password123',
          role: 'patient'
        });

      expect(response.status).toBe(302); // Redirect
      
      const user = await User.findOne({ email: 'newpatient@test.com' });
      expect(user).toBeTruthy();
      expect(user.role).toBe('patient');
    });

    it('should register a new doctor successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newdoctor@test.com',
          password: 'password123',
          confirm_password: 'password123',
          role: 'doctor'
        });

      expect(response.status).toBe(302);
      
      const user = await User.findOne({ email: 'newdoctor@test.com' });
      expect(user).toBeTruthy();
      expect(user.role).toBe('doctor');
    });

    it('should fail with mismatched passwords', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          confirm_password: 'different',
          role: 'patient'
        });

      expect(response.status).toBe(302);
      
      const user = await User.findOne({ email: 'test@test.com' });
      expect(user).toBeNull();
    });

    it('should fail with duplicate email', async () => {
      await createTestUser({ email: 'existing@test.com' });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'password123',
          confirm_password: 'password123',
          role: 'patient'
        });

      expect(response.status).toBe(302);
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          confirm_password: 'password123',
          role: 'admin' // Invalid role
        });

      expect(response.status).toBe(302);
      
      const user = await User.findOne({ email: 'test@test.com' });
      expect(user).toBeNull();
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          password: '123', // Too short
          confirm_password: '123',
          role: 'patient'
        });

      expect(response.status).toBe(302);
      
      const user = await User.findOne({ email: 'test@test.com' });
      expect(user).toBeNull();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'login@test.com',
        password: 'password123',
        role: 'patient'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(302); // Redirect to dashboard
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(302); // Redirect back to login
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(302);
    });

    it('should redirect doctor to doctor dashboard', async () => {
      const doctor = await createTestUser({
        email: 'doctor@test.com',
        password: 'password123',
        role: 'doctor'
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/doctor/dashboard');
    });

    it('should redirect patient to patient dashboard', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/patient/dashboard');
    });
  });

  describe('GET /auth/logout', () => {
    it('should logout user successfully', async () => {
      const user = await createTestUser();
      const agent = request.agent(app);

      // Login first
      await agent
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        });

      // Then logout
      const response = await agent.get('/auth/logout');
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/auth/login');
    });
  });
});