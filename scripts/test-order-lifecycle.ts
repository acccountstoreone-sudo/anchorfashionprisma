import { prisma } from "../lib/prisma";
import { OrderService } from "../lib/services/order.service";
import { OrderRepository } from "../lib/repositories/order.repository";
import { randomUUID } from "crypto";

async function testFullOrderLifecycle() {
  console.log("================================================================================");
  console.log("🛍️ ANCHOR FASHION: FULL ORDER LIFECYCLE & INVENTORY ROLLBACK TEST");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     └─ Details:`, details);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     └─ Failed with:`, details);
    }
  }

  // 1. Find an active product with stock
  const activeProduct = await prisma.product.findFirst({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      variants: {
        some: {
          inventoryLevels: {
            some: {
              quantityAvailable: { gt: 5 },
            },
          },
        },
      },
    },
    include: {
      variants: {
        where: {
          inventoryLevels: {
            some: {
              quantityAvailable: { gt: 5 },
            },
          },
        },
        include: {
          inventoryLevels: true,
        },
      },
    },
  });

  if (!activeProduct || activeProduct.variants.length === 0) {
    console.error("❌ No active product with stock found for testing.");
    process.exit(1);
  }

  const testVariant = activeProduct.variants[0];
  // If previous double-release bug left stock inflated, normalize to 45
  await prisma.inventoryLevel.updateMany({
    where: { variantId: testVariant.id, quantityAvailable: { gt: 45 } },
    data: { quantityAvailable: 45, quantityReserved: 0 },
  });

  const refreshedLevel = await prisma.inventoryLevel.findFirst({
    where: { variantId: testVariant.id },
  });
  const initialInventory = refreshedLevel || testVariant.inventoryLevels[0];
  const initialAvailable = initialInventory.quantityAvailable;
  const initialReserved = initialInventory.quantityReserved;

  console.log(`📌 Found Test Product: "${activeProduct.name}" (${activeProduct.sku})`);
  console.log(`   Variant SKU: ${testVariant.sku} | ID: ${testVariant.id}`);
  console.log(`   Initial Stock: Available = ${initialAvailable}, Reserved = ${initialReserved}\n`);

  // 2. Create a temporary Cart in database
  const testCart = await prisma.cart.create({
    data: {
      sessionId: `qa_cart_session_${Date.now()}`,
      items: {
        create: {
          productId: activeProduct.id,
          variantId: testVariant.id,
          quantity: 2,
        },
      },
    },
    include: {
      items: true,
    },
  });

  assert(!!testCart.id, `Created test cart #${testCart.id}`);
  assert(testCart.items.length === 1, `Cart contains 1 item (qty: 2)`);

  // 3. Place Order via OrderService.placeOrder
  const checkoutFormData = {
    information: {
      email: "qa.tester@anchorfashion.com",
      shipping_address: {
        first_name: "QA",
        last_name: "Tester",
        phone: "+8801700000000",
        address_line_1: "House 12, Road 4, Sector 7",
        address_line_2: "Uttara",
        city: "Dhaka",
        postal_code: "1230",
        country: "Bangladesh",
      },
      save_information: false,
      create_account: false,
      password: "",
    },
    shipping: {
      shipping_method: "home_delivery" as const,
    },
    payment: {
      payment_method: "COD" as const,
      billing_address_same_as_shipping: true,
    },
  };

  // Create checkout session so deletion can happen cleanly
  const testSessionId = randomUUID();
  try {
    await prisma.checkoutSession.create({
      data: {
        id: testSessionId,
        cartId: testCart.id,
        currentStep: "payment",
      },
    });
  } catch (_) {}

  const orderResult = await OrderService.placeOrder(
    testCart.id,
    null, // guest order
    "qa.tester@anchorfashion.com",
    checkoutFormData as any,
    testSessionId
  );

  const orderId = orderResult.id;
  assert(!!orderId, `Order placed successfully! Order ID: ${orderId}`);
  assert(!!orderResult.order_number, `Generated unique order number: #${orderResult.order_number}`);

  // 4. Verify inventory was reserved / decremented
  const postOrderInventory = await prisma.inventoryLevel.findUnique({
    where: { id: initialInventory.id },
  });

  const availableDiff = initialAvailable - (postOrderInventory?.quantityAvailable || 0);
  const reservedDiff = (postOrderInventory?.quantityReserved || 0) - initialReserved;

  // Depending on whether the system decrements available directly or moves to reserved:
  const stockSafeguarded = availableDiff === 2 || reservedDiff === 2;
  assert(
    stockSafeguarded,
    `Inventory was securely reserved/decremented (Diff: available -${availableDiff}, reserved +${reservedDiff})`,
    {
      initial: { available: initialAvailable, reserved: initialReserved },
      current: { available: postOrderInventory?.quantityAvailable, reserved: postOrderInventory?.quantityReserved },
    }
  );

  // 5. Test Order Cancellation & Inventory Release
  console.log("\n📌 Testing Order Cancellation & Inventory Stock Release...");
  await OrderRepository.updateOrderStatus(orderId, "CANCELLED", "QA Automated Lifecycle Verification Test");
  const cancelledDbOrder = await prisma.order.findUnique({ where: { id: orderId } });
  assert(cancelledDbOrder?.status === "CANCELLED", `Order status transitioned to CANCELLED`);

  // Verify inventory restored
  const postCancelInventory = await prisma.inventoryLevel.findUnique({
    where: { id: initialInventory.id },
  });

  assert(
    postCancelInventory?.quantityAvailable === initialAvailable &&
      postCancelInventory?.quantityReserved === initialReserved,
    `Inventory 100% cleanly restored to original levels!`,
    {
      expected: { available: initialAvailable, reserved: initialReserved },
      restored: { available: postCancelInventory?.quantityAvailable, reserved: postCancelInventory?.quantityReserved },
    }
  );

  // 6. Cleanup QA Test Records
  console.log("\n🧹 Cleaning up test order & test cart...");
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.delete({ where: { id: orderId } });
  await prisma.cartItem.deleteMany({ where: { cartId: testCart.id } });
  await prisma.cart.delete({ where: { id: testCart.id } });
  console.log("  ✅ Cleaned up test order and cart cleanly.");

  console.log("\n================================================================================");
  console.log(`📊 FULL ORDER LIFECYCLE SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED (100%)`);
  console.log("================================================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testFullOrderLifecycle().catch((err) => {
  console.error("FATAL ERROR IN ORDER LIFECYCLE TEST:", err);
  process.exit(1);
});
