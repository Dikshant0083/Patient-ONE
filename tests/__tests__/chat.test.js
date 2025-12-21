// ===================================================================
// FILE: tests/__tests__/chat.test.js
// ===================================================================

const app = require('../../app');
const Message = require('../../models/Message');

const {
  createAuthenticatedPatient,
  createAuthenticatedDoctor
} = require('../helpers/testHelpers');

// Same roomId logic as app
const generateRoomId = (id1, id2) =>
  [id1.toString(), id2.toString()].sort().join('_');

describe('Chat Routes', () => {

  describe('GET /chat/patient/:doctorId', () => {
    it('should show chat page for patient', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);
      const { doctor } = await createAuthenticatedDoctor(app);

      const response = await agent
        .get(`/chat/patient/${doctor._id}`)
        .expect(200);

      expect(response.text).toContain('Chat with');
      expect(response.text).toContain('Dr. Test'); // UI shows NAME, not email
    });

    it('should deny access to non-patients', async () => {
      const { doctor, agent } = await createAuthenticatedDoctor(app);
      const { patient } = await createAuthenticatedPatient(app);

      await agent
        .get(`/chat/patient/${patient._id}`)
        .expect(302);
    });

    it('should show existing messages', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);
      const { doctor } = await createAuthenticatedDoctor(app);

      const roomId = generateRoomId(patient._id, doctor._id);

      await Message.create({
        from: patient._id,
        to: doctor._id,
        text: 'Hello Doctor',
        roomId
      });

      const response = await agent
        .get(`/chat/patient/${doctor._id}`)
        .expect(200);

      expect(response.text).toContain('Hello Doctor');
    });
  });

  describe('GET /chat/doctor/:patientId', () => {
    it('should show chat page for doctor', async () => {
      const { doctor, agent } = await createAuthenticatedDoctor(app);
      const { patient } = await createAuthenticatedPatient(app);

      const response = await agent
        .get(`/chat/doctor/${patient._id}`)
        .expect(200);

      expect(response.text).toContain('Chat with');
      expect(response.text).toContain('Test User'); // UI shows NAME
    });

    it('should deny access to non-doctors', async () => {
      const { patient, agent } = await createAuthenticatedPatient(app);
      const { doctor } = await createAuthenticatedDoctor(app);

      await agent
        .get(`/chat/doctor/${doctor._id}`)
        .expect(302);
    });
  });

});
