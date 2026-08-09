const express = require("express");
const router = express.Router();
const { prisma } = require("../../config/database");
const config = require("../../config");

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      service: "ERP Backend",
      version: "1.0.0",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { database: "connected" } });
  } catch (error) {
    res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database connection failed" } });
  }
});

router.get("/redis", async (req, res) => {
  try {
    const { getRedisClient } = require("../../config/redis");
    const client = getRedisClient();
    if (client?.isReady) {
      res.json({ success: true, data: { redis: "connected" } });
    } else {
      res.json({ success: true, data: { redis: "disconnected" } });
    }
  } catch (error) {
    res.json({ success: true, data: { redis: "unavailable" } });
  }
});

module.exports = router;
