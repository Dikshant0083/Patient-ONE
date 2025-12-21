// ===================================================================
// FILE: tests/__tests__/profile.test.js
// ===================================================================
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const {
  createAuthenticatedPatient,
  createAuthenticatedDoctor
} = require('../helpers/testHelpers');

describe('Profile Routes', () => {

  describe('GET /profile', () => {
    it('should show profile page for authenticated user', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .get('/profile')
        .expect(200);

      expect(response.text).toContain('Your Profile');
      expect(response.text).toContain(patient.email);
    });

    it('should deny access to unauthenticated users', async () => {
      const response = await request(app)
        .get('/profile')
        .expect(302);

      expect(response.header.location).toContain('/auth/login');
    });
  });

  describe('POST /profile/update', () => {
    it('should update user profile successfully', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .post('/profile/update')
        .send({
          name: 'Updated Name',
          profilePhotoUrl: 'https://example.com/photo.jpg'
        })
        .expect(302);

      const updatedUser = await User.findById(patient._id);
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.profilePhotoUrl).toBe('https://example.com/photo.jpg');
    });

    it('should handle empty values gracefully', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .post('/profile/update')
        .send({
          name: '',
          profilePhotoUrl: ''
        })
        .expect(302);

      const updatedUser = await User.findById(patient._id);
      expect(updatedUser).toBeTruthy();
    });
  });

  describe('POST /profile/password', () => {
    it('should change password successfully', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .post('/profile/password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
          confirmNewPassword: 'newpassword123'
        })
        .expect(302);

      // Try logging in with new password
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: patient.email,
          password: 'newpassword123'
        })
        .expect(302);

      expect(loginResponse.header.location).toContain('/dashboard');
    });

    it('should fail with incorrect current password', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .post('/profile/password')
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
          confirmNewPassword: 'newpassword123'
        })
        .expect(302);

      // Old password should still work
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: patient.email,
          password: 'password123'
        })
        .expect(302);
    });

    it('should fail with mismatched new passwords', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .post('/profile/password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
          confirmNewPassword: 'different123'
        })
        .expect(302);
    });

    it('should fail with short new password', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);

      const response = await agent
        .post('/profile/password')
        .send({
          currentPassword: 'password123',
          newPassword: '123',
          confirmNewPassword: '123'
        })
        .expect(302);
    });
  });

  describe('POST /profile/delete', () => {
    it('should delete user account successfully', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);
      const userId = patient._id;

      const response = await agent
        .post('/profile/delete')
        .expect(302);

      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });
  });
});
