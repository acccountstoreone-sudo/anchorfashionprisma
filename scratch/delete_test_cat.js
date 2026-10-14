const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slug = 'test-cat-1791800729725';
  const cat = await prisma.category.findUnique({
    where: { slug }
  });

  if (!cat) {
    console.log(`Category with slug ${slug} not found.`);
    return;
  }

  console.log(`Found category: ${cat.name} (id: ${cat.id})`);

  // Disconnect / delete any product category links if present
  const pcCount = await prisma.productCategory.deleteMany({
    where: { categoryId: cat.id }
  });
  console.log(`Deleted ${pcCount.count} product category relations.`);

  // Delete category
  await prisma.category.delete({
    where: { id: cat.id }
  });

  console.log(`Successfully deleted category ${cat.name} (${cat.slug}) from database.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
