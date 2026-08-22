const Redis = require("ioredis");
const config = require("./index");

let redis;
let redisAvailable = false;

function getRedis() {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      lazyConnect: true,
    });

    redis.on("connect", () => {
      redisAvailable = true;
      if (config.nodeEnv !== "test") console.log("Redis connected");
    });

    redis.on("error", (err) => {
      if (redisAvailable) {
        console.error("Redis error:", err.message);
      }
      redisAvailable = false;
    });
  }
  return redis;
}

async function connectRedis() {
  const client = getRedis();
  await client.connect();
  return client;
}

async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    redisAvailable = false;
  }
}

function isRedisAvailable() {
  return redisAvailable && redis?.isReady;
}

module.exports = { getRedis, connectRedis, disconnectRedis, isRedisAvailable };
