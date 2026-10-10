const { PrismaClient } = require('@prisma/client');

async function testConcurrent() {
  const poolerUrl = "postgresql://neondb_owner:npg_zM5AjDtG1hkO@ep-dawn-bonus-b41nfjyi-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&pool_timeout=30";
  console.log("Testing 15 parallel queries through Pooler...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: poolerUrl
      }
    }
  });

  try {
    const promises = Array.from({ length: 15 }).map((_, i) =>
      prisma.category.findMany().then(r => `Query ${i + 1}: ${r.length} categories`)
    );
    const results = await Promise.all(promises);
    console.log("ALL 15 CONCURRENT QUERIES SUCCEEDED!");
    console.log(results[0]);
  } catch (e) {
    console.error("Concurrent query failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

testConcurrent();
