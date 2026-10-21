import { prisma } from "../lib/prisma";

async function checkDatabaseHealth() {
  console.log("================================================================================");
  console.log("🔍 ANCHOR FASHION: FULL SYSTEM & DATABASE HEALTH AUDIT");
  console.log("================================================================================\n");

  const start = Date.now();
  try {
    // 1. Connection check
    await prisma.$queryRaw`SELECT 1 as connected`;
    console.log(`✅ [DB CONNECTIVITY] Connected to Neon Postgres in ${Date.now() - start}ms\n`);

    // 2. Discover and count key models dynamically
    const modelNames = [
      "profile",
      "customer",
      "product",
      "variant",
      "category",
      "brand",
      "order",
      "inventoryLevel",
      "warehouse",
      "stockMovement",
      "review",
      "coupon",
      "heroSlide",
      "featuredPromoBanner",
      "storeSetting",
    ];

    console.log("📊 DATABASE TABLE RECORD AUDIT:");
    for (const model of modelNames) {
      if ((prisma as any)[model] && typeof (prisma as any)[model].count === "function") {
        try {
          const count = await (prisma as any)[model].count();
          console.log(`  • ${model.padEnd(20)}: ${count}`);
        } catch (e: any) {
          console.log(`  • ${model.padEnd(20)}: Error reading table (${e.message})`);
        }
      }
    }

    // 3. Product Status Breakdown
    const [draftProducts, activeProducts, archivedProducts] = await Promise.all([
      prisma.product.count({ where: { status: "DRAFT", deletedAt: null } }),
      prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.product.count({ where: { status: "ARCHIVED", deletedAt: null } }),
    ]);

    console.log("\n🏷️ PRODUCT STATUS BREAKDOWN:");
    console.log(`  • Active (Published on Storefront): ${activeProducts}`);
    console.log(`  • Draft (In Inventory Warehouse):   ${draftProducts}`);
    console.log(`  • Archived:                         ${archivedProducts}`);

    // 4. Inventory Stock Integrity Check
    const inventoryIntegrity = await prisma.inventoryLevel.aggregate({
      _sum: {
        quantityAvailable: true,
        quantityReserved: true,
      },
    });
    console.log("\n📦 INVENTORY LEVEL AUDIT:");
    console.log(`  • Total Units Available: ${inventoryIntegrity._sum.quantityAvailable || 0}`);
    console.log(`  • Total Units Reserved:  ${inventoryIntegrity._sum.quantityReserved || 0}`);

    // 5. Products without Variants Check
    const productsWithoutVariants = await prisma.product.count({
      where: {
        deletedAt: null,
        variants: { none: {} },
      },
    });
    if (productsWithoutVariants > 0) {
      console.warn(`\n⚠️ [WARNING] Found ${productsWithoutVariants} products without variants!`);
    } else {
      console.log(`\n✅ [INTEGRITY] All active products have associated variants.`);
    }

    // 6. Check Active Categories Tree
    const topCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
      take: 12,
    });
    console.log("\n📁 CATEGORIES HIERARCHY SAMPLE:");
    topCategories.forEach((cat) => {
      console.log(`  • ${cat.name} (${cat._count.products} products) [subcategories: ${cat.children.length}]`);
      cat.children.forEach((sub) => {
        console.log(`      └─ ${sub.name} (/${sub.slug})`);
      });
    });

    // 7. Recent Orders Check
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        paymentStatus: true,
        createdAt: true,
      },
    });
    console.log(`\n🛒 RECENT ORDERS SAMPLE (${recentOrders.length}):`);
    recentOrders.forEach((o) => {
      console.log(`  • #${o.orderNumber || o.id.slice(0, 8)} | Status: ${o.status} | Total: ৳${Number(o.totalAmount)} | Payment: ${o.paymentStatus}`);
    });

  } catch (err) {
    console.error("❌ DATABASE HEALTH AUDIT ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseHealth();
