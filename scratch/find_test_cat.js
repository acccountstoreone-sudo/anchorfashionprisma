const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const testCats = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'test', mode: 'insensitive' } },
        { name: { contains: 'test', mode: 'insensitive' } },
        { name: { contains: 'automated', mode: 'insensitive' } },
        { slug: 'test-cat-1791800729725' }
      ]
    }
  });
  console.log('Found categories:', JSON.stringify(testCats, null, 2));

  const allRootCats = await prisma.category.findMany({
    where: { parent_id: null },
    select: { id: true, name: true, slug: true, display_order: true, is_active: true }
  });
  console.log('Root categories count:', allRootCats.length);
  console.log('Root categories:', JSON.stringify(allRootCats, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
