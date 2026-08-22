const { z } = require("zod");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().default("postgresql://neondb_owner:npg_iRI5Vw0JfDtY@ep-wispy-wave-at4h59tw.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().default("your-access-secret-change-in-production-12345"),
  JWT_REFRESH_SECRET: z.string().default("your-refresh-secret-change-in-production-12345"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_S3_BUCKET: z.string().default("erp-uploads"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("noreply@erp.com"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn("⚠️ Warning: Invalid environment variables detected, using safe defaults:");
    result.error.errors.forEach((e) => {
      console.warn(`  ${e.path.join(".")}: ${e.message}`);
    });
  }
  return result.data || envSchema.parse({});
}

const env = validateEnv();

module.exports = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  database: { url: env.DATABASE_URL },
  redis: { url: env.REDIS_URL },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  cors: { origin: env.CORS_ORIGIN, credentials: true },
  storage: {
    driver: env.STORAGE_DRIVER,
    s3: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
      bucket: env.AWS_S3_BUCKET,
    },
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    from: env.SMTP_FROM,
  },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
};
