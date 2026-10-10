const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

async function testPrisma() {
  console.log('Testing Prisma connection with DATABASE_URL:');
  console.log(process.env.DATABASE_URL?.replace(/:[^:]+@/, ':***@'));

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    const cats = await prisma.category.findMany();
    console.log('Categories count:', cats.length);
    console.log('Success!');
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
