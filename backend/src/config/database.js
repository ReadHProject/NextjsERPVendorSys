const { PrismaClient } = require("@prisma/client");
const config = require("./index");

const dbUrl = config.database?.url || process.env.DATABASE_URL;

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
  }
  prisma = global.__prisma;
}

module.exports = { prisma };
