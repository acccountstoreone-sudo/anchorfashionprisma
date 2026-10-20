import { PrismaClient } from '@prisma/client';

async function main() {
  const p1 = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
  const p2 = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED } },
  });

  try {
    const p1Count = await p1.product.count();
    console.log('ep-dawn-bonus products count:', p1Count);
  } catch (e: any) {
    console.log('ep-dawn-bonus error:', e.message);
  }

  try {
    const p2Count = await p2.product.count();
    console.log('ep-autumn-cake products count:', p2Count);
  } catch (e: any) {
    console.log('ep-autumn-cake error:', e.message);
  }

  try {
    const authUsers: any = await p2.$queryRawUnsafe('SELECT count(*) FROM neon_auth.users');
    console.log('ep-autumn-cake neon_auth.users count:', authUsers);
  } catch (e: any) {
    console.log('ep-autumn-cake neon_auth error:', e.message);
  }

  await p1.$disconnect();
  await p2.$disconnect();
}

main().catch(console.error);
