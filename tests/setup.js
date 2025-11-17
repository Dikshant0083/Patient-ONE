// tests/setup.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer = null;

module.exports = {
  /**
   * Start an in-memory mongodb and connect mongoose.
   */
  connect: async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Note: remove deprecated options (Mongodb driver v4+)
    await mongoose.connect(uri);
  },

  /**
   * Clear all collections (use before each test if desired).
   */
  clearDatabase: async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      try {
        await collection.deleteMany({});
      } catch (err) {
        // ignore if collection doesn't exist yet
      }
    }
  },

  /**
   * Close mongoose connection and stop mongoServer.
   * Exported as both closeDatabase and close for backwards compatibility.
   */
  closeDatabase: async () => {
    try {
      await mongoose.connection.dropDatabase();
    } catch (e) { /* ignore */ }
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  },

  // alias for your tests that call setup.close()
  close: async () => {
    return module.exports.closeDatabase();
  }
};
