const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const categories = await prisma.category.findMany();
  console.log(JSON.stringify(categories, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
