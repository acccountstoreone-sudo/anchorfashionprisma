import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Syncing products to product_categories table...");
  const products = await prisma.product.findMany({
    where: {
      categoryId: { not: null }
    }
  });

  console.log(`Found ${products.length} products with a categoryId.`);

  let synced = 0;
  for (const p of products) {
    if (!p.categoryId) continue;

    // Check if relation already exists
    const existing = await prisma.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId: p.id,
          categoryId: p.categoryId,
        }
      }
    });

    if (!existing) {
      await prisma.productCategory.create({
        data: {
          productId: p.id,
          categoryId: p.categoryId,
        }
      });
      synced++;
    }
  }

  console.log(`Successfully synced ${synced} new product_category relations.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
