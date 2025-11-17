// tests/models/models.test.js
const mongoose = require("mongoose");
const setup = require("../setup");

// load models (adjust paths if your project differs)
const User = require("../../models/User");
const MedicalRecord = require("../../models/MedicalRecord");
const Message = require("../../models/Message");
const AccessControl = require("../../models/AccessControl");

beforeAll(async () => {
  jest.setTimeout(20000);
  await setup.connect();
});

afterEach(async () => {
  await setup.clearDatabase();
});

afterAll(async () => {
  await setup.close(); // now available as alias
});

describe("Models - User, MedicalRecord, Message, AccessControl", () => {
  it("mongoose connection should be connected", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it("creates and reads a User", async () => {
    const userData = {
      name: "Test User",
      email: "testuser@example.com",
      password: "plainpass",
      role: "patient"
    };
    const saved = await new User(userData).save();
    expect(saved._id).toBeDefined();
    expect(saved.email).toBe(userData.email);
  });

  it("creates and reads a MedicalRecord", async () => {
    const patient = await new User({
      name: "Patient A",
      email: "patientA@example.com",
      password: "pass",
      role: "patient"
    }).save();

    const recordData = {
      // adjust to match your MedicalRecord schema field names
      patientId: patient._id,
      fileUrl: "/uploads/test-report.pdf",
      description: "Test report"
    };

    const saved = await new (require("../../models/MedicalRecord"))(recordData).save();
    expect(saved.description).toBe("Test report");
    expect(String(saved.patientId)).toBe(String(patient._id));
  });

  it("creates and reads a Message (uses roomId, text, to, from)", async () => {
    // create users to reference (if your message expects objectIds)
    const fromUser = await new User({
      name: "From",
      email: "from@example.com",
      password: "pass",
      role: "patient"
    }).save();

    const toUser = await new User({
      name: "To",
      email: "to@example.com",
      password: "pass",
      role: "doctor"
    }).save();

    const messageData = {
      roomId: "room-123",           // adjust type if your schema uses ObjectId instead
      text: "Hello doctor, this is a test",
      to: toUser._id,
      from: fromUser._id
    };

    const saved = await new Message(messageData).save();
    expect(saved._id).toBeDefined();
    expect(saved.text).toBe(messageData.text);

    const found = await Message.findById(saved._id).lean();
    if (mongoose.isValidObjectId(found.to)) {
      expect(String(found.to)).toBe(String(toUser._id));
      expect(String(found.from)).toBe(String(fromUser._id));
    } else {
      // if your schema stores 'to'/'from' as string ids, still check equality
      expect(found.to).toBeDefined();
      expect(found.from).toBeDefined();
    }
  });

  it("creates and reads an AccessControl entry", async () => {
    const patient = await new User({
      name: "P",
      email: "p@example.com",
      password: "pass",
      role: "patient"
    }).save();

    const doctor = await new User({
      name: "D",
      email: "d@example.com",
      password: "pass",
      role: "doctor"
    }).save();

    const acData = {
      patientId: patient._id,
      doctorId: doctor._id,
      status: "pending"
    };

    const saved = await new AccessControl(acData).save();
    expect(saved._id).toBeDefined();
    expect(saved.status).toBe("pending");
  });
});
