import { prisma } from "../lib/prisma";

async function cleanTestData() {
  console.log("=== CLEANING TEST DATA IN NEON POSTGRESQL ===");

  // 1. Deactivate / clean QA Polo Shirts category
  const qaCategory = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: "qa-test-polo-shirts" },
        { name: { contains: "QA", mode: "insensitive" } },
      ],
    },
  });

  if (qaCategory) {
    console.log(`Found QA Category: ${qaCategory.name} (${qaCategory.id}). Setting isActive: false`);
    await prisma.category.update({
      where: { id: qaCategory.id },
      data: { isActive: false },
    });
  }

  // 2. Archive / set to DRAFT all QA test products
  const qaProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { startsWith: "QA" } },
        { name: { contains: "QA2" } },
        { name: { contains: "QA Stress" } },
        { sku: { startsWith: "QA" } },
        { sku: { startsWith: "AFPTS" } },
        { sku: { contains: "QA-STR" } },
        { sku: { contains: "QA2-MA" } },
        { sku: { contains: "TEST-E" } },
      ],
    },
    select: { id: true, name: true, sku: true, status: true },
  });

  console.log(`Found ${qaProducts.length} QA test products.`);
  for (const p of qaProducts) {
    console.log(`Setting product "${p.name}" (${p.sku}) to DRAFT...`);
    await prisma.product.update({
      where: { id: p.id },
      data: { status: "DRAFT" },
    });
  }

  // 3. Verify Active Categories that will show on Storefront
  const activeCategories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, slug: true, displayOrder: true },
  });

  console.log("\n=== ACTIVE TOP-LEVEL STOREFRONT CATEGORIES ===");
  activeCategories.forEach((c) =>
    console.log(`- ${c.name} (slug: "${c.slug}", order: ${c.displayOrder})`)
  );

  // 4. Verify Active Storefront Products
  const activeProducts = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { id: true, name: true, sku: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  console.log("\n=== TOP 10 ACTIVE STOREFRONT PRODUCTS ===");
  activeProducts.forEach((p) => console.log(`- [${p.sku}] ${p.name}`));
}

cleanTestData()
  .then(() => {
    console.log("\nCleanup completed successfully!");
  })
  .catch((err) => {
    console.error("Cleanup error:", err);
  })
  .finally(() => prisma.$disconnect());
