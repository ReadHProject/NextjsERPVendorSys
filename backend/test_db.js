const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Successfully connected to Aiven database via Prisma!');
  const result = await prisma.$queryRaw`SELECT current_database(), version();`;
  console.log('Query result:', result);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Connection failed:', err);
  process.exit(1);
});
