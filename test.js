require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Neon connection via Prisma...');
  const result = await prisma.$queryRawUnsafe('SELECT 1 as connected');
  console.log('Database query result:', result);
}

main()
  .catch(err => {
    console.error('Connection failed:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
