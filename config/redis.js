const { createClient } = require('redis');

const redisConfig = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : process.env.REDIS_HOST
    ? {
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT || 6379),
        },
      }
    : null;

let client = null;
let redisReady = false;

if (redisConfig) {
  client = createClient(redisConfig);

  client.on('error', (err) => {
    redisReady = false;
    console.error('Redis client error:', err.message);
  });

  client.connect()
    .then(() => {
      redisReady = true;
      console.log('Redis connected');
    })
    .catch((err) => {
      redisReady = false;
      console.error('Redis connection failed:', err.message);
    });
} else {
  console.warn('Redis is not configured. Record caching is disabled.');
}

const withRedis = async (method, fallbackValue, ...args) => {
  if (!client || !redisReady) {
    return fallbackValue;
  }

  try {
    return await client[method](...args);
  } catch (err) {
    console.error(`Redis ${method} failed:`, err.message);
    return fallbackValue;
  }
};

module.exports = {
  get: (...args) => withRedis('get', null, ...args),
  set: (...args) => withRedis('set', null, ...args),
  del: (...args) => withRedis('del', 0, ...args),
};
