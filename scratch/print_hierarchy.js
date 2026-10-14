const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rootCats = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true
        },
        orderBy: { displayOrder: 'asc' }
      }
    },
    orderBy: { displayOrder: 'asc' }
  });

  for (const c of rootCats) {
    console.log(`\n=== [${c.displayOrder}] ${c.name} (active: ${c.isActive}) ===`);
    for (const ch of c.children) {
      console.log(`  - ${ch.name} (slug: ${ch.slug}, active: ${ch.isActive})`);
      for (const g of ch.children) {
        console.log(`      * ${g.name} (slug: ${g.slug})`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
