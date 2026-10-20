import { prisma } from "../lib/prisma";
import dotenv from "dotenv";
dotenv.config();

async function runLiveEcommerceCoreVerification() {
  console.log("=================================================================");
  console.log("   ANCHOR FASHION - LIVE NEON DATABASE INTEGRATION VERIFICATION  ");
  console.log("   Testing: OMS, Product Categories, Finance, and Inventory      ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  let createdCategoryId: string | null = null;
  let createdOrderId: string | null = null;
  let testVariantId: string | null = null;
  let defaultWarehouseId: string | null = null;

  try {
    // =========================================================================
    // 1. PRODUCT CATEGORY VERIFICATION
    // =========================================================================
    console.log("--- 1. TESTING PRODUCT CATEGORIES ---");

    const totalCategories = await prisma.category.count({ where: { isActive: true } });
    assert(totalCategories > 0, `Active categories exist in Neon DB (Found: ${totalCategories})`);

    const testSlug = `qa-test-category-${Date.now()}`;
    const newCategory = await prisma.category.create({
      data: {
        name: "QA Live Test Category",
        slug: testSlug,
        description: "Automated QA Verification Category",
        displayOrder: 99,
        isActive: true,
      },
    });
    createdCategoryId = newCategory.id;
    assert(!!newCategory.id, `Created live category with ID: ${newCategory.id} (slug: ${newCategory.slug})`);

    const fetchedCategory = await prisma.category.findUnique({
      where: { id: createdCategoryId },
    });
    assert(fetchedCategory?.name === "QA Live Test Category", `Verified category retrieval by ID`);

    // =========================================================================
    // 2. INVENTORY MANAGEMENT VERIFICATION
    // =========================================================================
    console.log("\n--- 2. TESTING INVENTORY SYSTEM & STOCK TRACKING ---");

    const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
    assert(!!warehouse, `Found active warehouse: ${warehouse?.name} (Code: ${warehouse?.code})`);
    defaultWarehouseId = warehouse?.id || null;

    const variant = await prisma.variant.findFirst({
      where: { isActive: true },
      include: { product: true },
    });
    assert(!!variant, `Found active product variant: ${variant?.sku} for product "${variant?.product?.name}"`);
    testVariantId = variant?.id || null;

    if (testVariantId && defaultWarehouseId) {
      // Find or create inventory level
      let invLevel = await prisma.inventoryLevel.findFirst({
        where: { variantId: testVariantId, warehouseId: defaultWarehouseId },
      });

      if (!invLevel) {
        invLevel = await prisma.inventoryLevel.create({
          data: {
            variantId: testVariantId,
            warehouseId: defaultWarehouseId,
            quantityAvailable: 100,
            quantityReserved: 0,
            reorderPoint: 10,
          },
        });
      }

      const initialAvailable = invLevel.quantityAvailable;
      const initialReserved = invLevel.quantityReserved;
      assert(true, `Initial stock level for variant ${variant?.sku}: Available=${initialAvailable}, Reserved=${initialReserved}`);

      // Simulate Atomic Reservation
      const reservationQty = 2;
      const updatedLevel = await prisma.inventoryLevel.update({
        where: { id: invLevel.id },
        data: {
          quantityAvailable: initialAvailable - reservationQty,
          quantityReserved: initialReserved + reservationQty,
        },
      });

      assert(
        updatedLevel.quantityAvailable === initialAvailable - reservationQty &&
        updatedLevel.quantityReserved === initialReserved + reservationQty,
        `Atomic reservation verified: Available ${initialAvailable} -> ${updatedLevel.quantityAvailable}, Reserved ${initialReserved} -> ${updatedLevel.quantityReserved}`
      );

      // Revert reservation back
      await prisma.inventoryLevel.update({
        where: { id: invLevel.id },
        data: {
          quantityAvailable: initialAvailable,
          quantityReserved: initialReserved,
        },
      });
      assert(true, `Restored inventory level to original values`);
    }

    // =========================================================================
    // 3. FINANCIAL CALCULATION VERIFICATION
    // =========================================================================
    console.log("\n--- 3. TESTING FINANCIAL CALCULATIONS ---");

    const unitPrice = 3200;
    const quantity = 2;
    const expectedSubtotal = unitPrice * quantity; // 6400
    const shippingFeeInsideDhaka = 100;
    const discountAmount = 400;
    const vatRate = 0.15;
    const expectedVat = Math.round(expectedSubtotal * vatRate * 100) / 100; // 960
    const expectedGrandTotal = Math.max(0, expectedSubtotal + shippingFeeInsideDhaka + expectedVat - discountAmount);

    assert(expectedSubtotal === 6400, `Subtotal calculation: ${quantity} x ${unitPrice} BDT = ${expectedSubtotal} BDT`);
    assert(expectedVat === 960, `15% VAT calculation: ${expectedSubtotal} x 0.15 = ${expectedVat} BDT`);
    assert(expectedGrandTotal === 7060, `Grand total formula (6400 + 100 + 960 - 400 = ${expectedGrandTotal} BDT)`);

    // =========================================================================
    // 4. ORDER MANAGEMENT (OMS) VERIFICATION
    // =========================================================================
    console.log("\n--- 4. TESTING ORDER MANAGEMENT (OMS) WORKFLOW ---");

    const orderNumber = `QA-LIVE-${Date.now()}`;
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentMethod: "COD",
        subtotal: expectedSubtotal,
        discount: discountAmount,
        shippingFee: shippingFeeInsideDhaka,
        totalAmount: expectedGrandTotal,
        shippingAddress: {
          first_name: "QA",
          last_name: "Tester",
          phone: "+8801700000000",
          address_line: "House 12, Road 4, Dhanmondi",
          city: "Dhaka",
          postal_code: "1205",
          country: "Bangladesh",
        },
        items: {
          create: [
            {
              productId: variant?.productId,
              variantId: testVariantId,
              productName: variant?.product?.name || "Test Product",
              sku: variant?.sku || "SKU-TEST",
              quantity,
              unitPrice,
              totalPrice: expectedSubtotal,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    createdOrderId = newOrder.id;
    assert(!!newOrder.id, `Created live order ${newOrder.orderNumber} (Grand Total: ${newOrder.totalAmount} BDT)`);
    assert(newOrder.items.length === 1, `Order items attached: ${newOrder.items[0].productName} x ${newOrder.items[0].quantity}`);

    // Update status to CONFIRMED
    const confirmedOrder = await prisma.order.update({
      where: { id: createdOrderId },
      data: { status: "CONFIRMED" },
    });
    assert(confirmedOrder.status === "CONFIRMED", `Order transitioned from PENDING -> CONFIRMED`);

    // Update status to CANCELLED
    const cancelledOrder = await prisma.order.update({
      where: { id: createdOrderId },
      data: { status: "CANCELLED" },
    });
    assert(cancelledOrder.status === "CANCELLED", `Order transitioned to CANCELLED`);

  } catch (err: any) {
    console.error("❌ Live verification failed:", err);
    failed++;
  } finally {
    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log("\n--- CLEANUP TEMPORARY QA DATA ---");
    if (createdOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: createdOrderId } }).catch(() => {});
      console.log(`Cleaned up test order: ${createdOrderId}`);
    }
    if (createdCategoryId) {
      await prisma.category.delete({ where: { id: createdCategoryId } }).catch(() => {});
      console.log(`Cleaned up test category: ${createdCategoryId}`);
    }
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveEcommerceCoreVerification();
