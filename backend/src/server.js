const app = require("./app");
const config = require("./config");

const PORT = config.port;

async function start() {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("Database connected");

    try {
      const { connectRedis } = require("./config/redis");
      await connectRedis();
    } catch (err) {
      console.warn("Redis connection failed (non-fatal):", err.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api/v1`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
