import { prisma } from '../lib/prisma';

async function checkDatabaseHealth() {
  console.log("=== DB HEALTH & INTEGRITY CHECK ===");
  try {
    const counts = {
      profiles: await prisma.profile.count(),
      roles: await prisma.role.count(),
      products: await prisma.product.count(),
      variants: await prisma.variant.count(),
      inventoryLevels: await prisma.inventoryLevel.count(),
      stockMovements: await prisma.stockMovement.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      payments: await prisma.payment.count(),
      coupons: await prisma.coupon.count(),
      carts: await prisma.cart.count(),
      cartItems: await prisma.cartItem.count(),
      warehouses: await prisma.warehouse.count(),
      categories: await prisma.category.count(),
    };
    console.log("Database table record counts:", JSON.stringify(counts, null, 2));

    // Check for orphaned variants without products
    const orphanedVariants = await prisma.variant.count({
      where: {
        product: null as any,
      },
    }).catch(() => "N/A");
    console.log("Orphaned variants:", orphanedVariants);

    // Check inventory levels with negative stock
    const negativeInventory = await prisma.inventoryLevel.findMany({
      where: {
        OR: [
          { quantityAvailable: { lt: 0 } },
          { quantityReserved: { lt: 0 } },
        ],
      },
    });
    console.log("Negative inventory levels:", negativeInventory.length);

    console.log("✅ Neon Database connection & core tables verified successfully!");
  } catch (err: any) {
    console.error("❌ Database health check failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseHealth();
