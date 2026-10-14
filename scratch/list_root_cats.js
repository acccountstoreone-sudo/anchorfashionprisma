const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allRootCats = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true
        }
      }
    },
    orderBy: { displayOrder: 'asc' }
  });
  console.log('Total root categories:', allRootCats.length);
  for (const c of allRootCats) {
    console.log(`[${c.displayOrder}] ${c.name} (${c.slug}) active=${c.isActive} children=${c.children.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
