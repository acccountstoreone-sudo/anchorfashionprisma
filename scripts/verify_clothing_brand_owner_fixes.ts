import { prisma } from "../lib/prisma";
import { CartService } from "../lib/services/cart.service";
import { InventoryService } from "../services/inventory.service";
import { syncProductPrices } from "../app/actions/admin/category-products.actions";

async function runBrandOwnerVerification() {
  console.log("\n=======================================================");
  console.log("👔 REAL CLOTHING BRAND OWNER BUG AUDIT & VERIFICATION");
  console.log("=======================================================\n");

  let passed = true;

  // -----------------------------------------------------------------
  // 1. Guest Add-to-Cart Verification
  // -----------------------------------------------------------------
  console.log("▶ [Test 1] Guest Add-to-Cart Workflow:");
  const activeProduct = await prisma.product.findFirst({
    where: { status: "ACTIVE", deletedAt: null },
    include: { variants: { where: { isActive: true } } },
  });

  if (!activeProduct) {
    throw new Error("No active product found for testing!");
  }

  const testVariant = activeProduct.variants[0];
  const guestSessionId = `test_guest_session_${Date.now()}`;
  console.log(`  Testing with Active Product: "${activeProduct.name}" (${activeProduct.id})`);
  console.log(`  Guest Session ID: ${guestSessionId}`);

  try {
    // Add item to cart with NO userId (pure guest session)
    await CartService.addItem(
      null, // userId is null
      guestSessionId, // sessionId
      activeProduct.id,
      testVariant?.id || null,
      1
    );

    const guestCart = await CartService.getOrCreateCart(null, guestSessionId);
    console.log(`  ✓ Guest cart created successfully! Cart ID: ${guestCart.id}`);
    console.log(`  ✓ Cart items count: ${guestCart.items?.length || 0}`);
    const foundItem = guestCart.items?.find((i: any) => i.product_id === activeProduct.id);
    if (foundItem) {
      console.log(`  ✓ Found product in guest cart: ${(foundItem.product as any)?.title || (foundItem.product as any)?.name} (Qty: ${foundItem.quantity})`);
    } else {
      console.error("  ❌ Added item not found in guest cart!");
      passed = false;
    }

    // Cleanup guest cart
    await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
    await prisma.cart.delete({ where: { id: guestCart.id } });
    console.log("  ✓ Cleaned up test guest cart.");
  } catch (err: any) {
    console.error("  ❌ Guest Add-to-Cart failed:", err.message);
    passed = false;
  }

  // -----------------------------------------------------------------
  // 2. Order Cancellation Stock Movement Audit
  // -----------------------------------------------------------------
  console.log("\n▶ [Test 2] Order Cancellation Stock Movement Audit Ledger:");
  const testWarehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  if (testWarehouse && testVariant) {
    // Create temporary test order
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `AUDIT-ORD-${Date.now().toString().slice(-4)}`,
        status: "PENDING",
        totalAmount: 1200,
        subtotal: 1200,
        shippingAddress: {
          first_name: "Test",
          last_name: "Customer",
          phone: "01700000000",
          address_line_1: "Banani, Dhaka",
          city: "Dhaka",
          country: "BD",
        },
        items: {
          create: [
            {
              productId: activeProduct.id,
              variantId: testVariant.id,
              productName: activeProduct.name,
              sku: testVariant.sku,
              quantity: 2,
              unitPrice: 600,
              totalPrice: 1200,
            },
          ],
        },
      },
    });

    console.log(`  Created test order: ${testOrder.orderNumber} (${testOrder.id})`);

    // Call releaseOrderInventory
    const inventoryService = new InventoryService();
    await inventoryService.releaseOrderInventory(testOrder.id);

    // Verify StockMovement record was logged
    const cancelMovements = await prisma.stockMovement.findMany({
      where: {
        referenceId: testOrder.id,
        referenceType: "ORDER_CANCELLED",
      },
    });

    console.log(`  ✓ StockMovements logged on cancellation: ${cancelMovements.length} record(s)`);
    if (cancelMovements.length > 0) {
      console.log(`    - Movement: ${cancelMovements[0].movementType} ${cancelMovements[0].quantity} units (new qty: ${cancelMovements[0].newQuantity}) | notes: "${cancelMovements[0].notes}"`);
    } else {
      console.error("  ❌ StockMovement was not created on order cancellation!");
      passed = false;
    }

    // Cleanup test order
    await prisma.stockMovement.deleteMany({ where: { referenceId: testOrder.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log("  ✓ Cleaned up test order and movement records.");
  }

  // -----------------------------------------------------------------
  // 3. Category Inline Price Sync to Variants
  // -----------------------------------------------------------------
  console.log("\n▶ [Test 3] Inline Price Edit Sync to Variants:");
  // Create single test product with default variant
  const singleProd = await prisma.product.create({
    data: {
      name: "Inline Price Test Shirt",
      slug: `inline-price-test-${Date.now()}`,
      basePrice: 1000,
      costPrice: 600,
      status: "DRAFT",
      categoryId: activeProduct.categoryId,
      variants: {
        create: {
          sku: `IPTEST-${Date.now().toString().slice(-4)}`,
          priceOverride: 1000,
          costPrice: 600,
          attributes: { Standard: "Default" },
        },
      },
    },
    include: { variants: true },
  });

  const variantId = singleProd.variants[0].id;
  console.log(`  Created single product with variant ID: ${variantId} (Initial Price: ৳1000)`);

  // Update prices via syncProductPrices (inline category edit logic)
  await syncProductPrices(singleProd.id, 1250, 1100, 750);

  const updatedVariant = await prisma.variant.findUnique({
    where: { id: variantId },
  });

  console.log(`  Updated Variant priceOverride: ৳${updatedVariant?.priceOverride}, salePrice: ৳${updatedVariant?.salePrice}, costPrice: ৳${updatedVariant?.costPrice}`);

  if (Number(updatedVariant?.priceOverride) === 1250 && Number(updatedVariant?.salePrice) === 1100) {
    console.log("  ✓ Variant prices correctly synchronized with parent product!");
  } else {
    console.error("  ❌ Variant prices were not updated!");
    passed = false;
  }

  // Cleanup test product
  await prisma.variant.delete({ where: { id: variantId } });
  await prisma.product.delete({ where: { id: singleProd.id } });
  console.log("  ✓ Cleaned up test price product.");

  console.log("\n=======================================================");
  if (passed) {
    console.log("🎉 ALL REAL CLOTHING BRAND OWNER TESTS PASSED 100%!");
  } else {
    console.log("❌ DETECTED FAILURE IN BRAND OWNER TESTS");
  }
  console.log("=======================================================\n");
}

runBrandOwnerVerification()
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
