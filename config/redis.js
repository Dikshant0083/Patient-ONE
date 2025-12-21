const { createClient } = require("redis");

const client = createClient({
  username: "default",
  password: "8ZbdjfcIGgSfYha9Cj96UnEAgzqORCwM", // your RedisCloud password
  socket: {
    host: "redis-17704.crce220.us-east-1-4.ec2.cloud.redislabs.com",
    port: 17704
  }
});

// Error handling
client.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

// Connect automatically
(async () => {
  try {
    await client.connect();
    console.log("✔ Connected to Redis Cloud");
  } catch (err) {
    console.error("❌ Redis Cloud Connection Failed:", err);
    process.exit(1);
  }
})();

module.exports = client;
