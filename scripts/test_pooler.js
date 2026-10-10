const { PrismaClient } = require('@prisma/client');

async function testPooler() {
  const poolerUrl = "postgresql://neondb_owner:npg_zM5AjDtG1hkO@ep-dawn-bonus-b41nfjyi-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";
  console.log("Testing Pooler URL...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: poolerUrl
      }
    },
    log: ['error', 'warn']
  });

  try {
    const cats = await prisma.category.findMany();
    console.log("Pooler connection SUCCESS! Categories:", cats.length);
  } catch (e) {
    console.error("Pooler connection FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPooler();
