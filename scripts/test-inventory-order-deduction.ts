import { prisma } from "../lib/prisma";
import { InventoryService } from "../services/inventory.service";

async function testInventoryOrderDeduction() {
  console.log("================================================================================");
  console.log("📦 QA TEST: INVENTORY DEDUCTION & STOCK MOVEMENT AUDIT ON ORDER");
  console.log("================================================================================\n");

  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });

  if (!category || !warehouse) {
    console.error("Prerequisites missing (category or warehouse).");
    process.exit(1);
  }

  const testSku = `AF-TEST-ORD-${Date.now().toString().slice(-4)}`;
  const testProduct = await prisma.product.create({
    data: {
      name: "QA Order Stock Test Item",
      slug: `qa-order-test-${Date.now()}`,
      sku: testSku,
      basePrice: 1200,
      costPrice: 600,
      status: "ACTIVE",
      categoryId: category.id,
      variants: {
        create: [
          {
            sku: `${testSku}-BLK-L`,
            priceOverride: 1200,
            costPrice: 600,
            attributes: { Color: "Black", Size: "L" },
            isActive: true,
            inventoryLevels: {
              create: {
                warehouseId: warehouse.id,
                quantityAvailable: 50,
                quantityReserved: 0,
              },
            },
          },
        ],
      },
    },
    include: {
      variants: { include: { inventoryLevels: true } },
    },
  });

  const variant = testProduct.variants[0];
  console.log(`Created test style ${testSku} with variant ${variant.sku}, initial stock: 50`);

  const inventoryService = new InventoryService();
  const testOrderId = `QA-ORD-${Date.now()}`;

  // Deduct 4 units
  await inventoryService.deductStockForOrderItems(testOrderId, [
    {
      productId: testProduct.id,
      variantId: variant.id,
      sku: variant.sku,
      color: "Black",
      size: "L",
      quantity: 4,
    },
  ]);

  // Check updated inventory level
  const updatedLevel = await prisma.inventoryLevel.findFirst({
    where: { variantId: variant.id },
  });

  console.log(`Stock after order deduction: ${updatedLevel?.quantityAvailable} (Expected: 46)`);
  if (updatedLevel?.quantityAvailable !== 46) {
    throw new Error(`Expected quantityAvailable to be 46, got ${updatedLevel?.quantityAvailable}`);
  }

  // Check stock movement audit log
  const movement = await prisma.stockMovement.findFirst({
    where: {
      variantId: variant.id,
      referenceId: testOrderId,
    },
  });

  console.log(`StockMovement logged: ${movement?.movementType}, qty: ${movement?.quantity}, prev: ${movement?.previousQuantity}, new: ${movement?.newQuantity}`);
  if (!movement || movement.newQuantity !== 46 || movement.quantity !== -4) {
    throw new Error("Stock movement audit row was not correctly logged!");
  }

  // Clean up
  await prisma.stockMovement.deleteMany({ where: { variantId: variant.id } });
  await prisma.inventoryLevel.deleteMany({ where: { variantId: variant.id } });
  await prisma.variant.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });

  console.log("\n✅ [PASS] Real-time inventory deduction & stock audit verified 100% successfully!");
  await prisma.$disconnect();
}

testInventoryOrderDeduction().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
