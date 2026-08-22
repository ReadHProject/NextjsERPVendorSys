const { getRedis, isRedisAvailable } = require("../config/redis");

const DEFAULT_TTL = 300;

class CacheService {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      this.client = getRedis();
    }
    return this.client;
  }

  async get(key) {
    if (!isRedisAvailable()) return null;
    try {
      const client = this.getClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key, value, ttl = DEFAULT_TTL) {
    if (!isRedisAvailable()) return;
    try {
      const client = this.getClient();
      await client.set(key, JSON.stringify(value), "EX", ttl);
    } catch {
      // cache failure is non-fatal
    }
  }

  async del(key) {
    if (!isRedisAvailable()) return;
    try {
      const client = this.getClient();
      await client.del(key);
    } catch {
      // ignore
    }
  }

  async invalidatePattern(pattern) {
    if (!isRedisAvailable()) return;
    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch {
      // ignore
    }
  }

  async flush() {
    if (!isRedisAvailable()) return;
    try {
      const client = this.getClient();
      await client.flushdb();
    } catch {
      // ignore
    }
  }

  cacheMiddleware(keyFn, ttl = DEFAULT_TTL) {
    return async (req, res, next) => {
      const key =
        typeof keyFn === "function" ? keyFn(req) : `cache:${req.originalUrl}`;
      try {
        const cached = await this.get(key);
        if (cached) {
          return res.json({ success: true, data: cached, cached: true });
        }
      } catch {
        // proceed without cache
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 400 && body?.success) {
          this.set(key, body.data, ttl).catch(() => {});
        }
        return originalJson(body);
      };
      next();
    };
  }
}

module.exports = new CacheService();
