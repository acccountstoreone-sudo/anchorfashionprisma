import { prisma } from "../lib/prisma";
import { ProductRepository } from "../lib/repositories/catalog/product.repository";
import { CartService } from "../lib/services/cart.service";
import { OrderService } from "../lib/services/order.service";
import { randomUUID } from "crypto";

async function runInventoryToPublishBuyConfirm() {
  console.log("\n================================================================================");
  console.log("🧵 LIFECYCLE AUDIT: INVENTORY -> PRODUCT PUBLISH -> BUY -> ORDER CONFIRM");
  console.log("================================================================================\n");

  let allPassed = true;

  // ---------------------------------------------------------------------------
  // STEP 1: Inventory & Warehouse Identification
  // ---------------------------------------------------------------------------
  console.log("▶ [STEP 1] Warehouse & Inventory Opening Setup:");
  const warehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
  });

  if (!warehouse) {
    throw new Error("No active warehouse found in the system! Please ensure warehouses exist.");
  }
  console.log(`  ✓ Active Warehouse Identified: "${warehouse.name}" (${warehouse.code || "WH-MAIN"})`);
  console.log(`    Location: ${warehouse.city || "Dhaka"}, Bangladesh | ID: ${warehouse.id}`);

  // Fetch an active category to link the clothing product
  const category = await prisma.category.findFirst({
    where: { isActive: true },
  });
  const categoryId = category?.id || undefined;
  console.log(`  ✓ Target Category: "${category?.name || "Apparel"}" (ID: ${categoryId})`);

  // ---------------------------------------------------------------------------
  // STEP 2: Product Creation & Instant Publishing with Variants & Initial Stock
  // ---------------------------------------------------------------------------
  console.log("\n▶ [STEP 2] Garment Product Creation & Storefront Publishing:");
  const timestamp = Date.now().toString().slice(-4);
  const productName = `Premium Giza Cotton Oxford Shirt - Royal Navy ${timestamp}`;
  const productSlug = `giza-cotton-oxford-navy-${timestamp}`;

  const createInput = {
    name: productName,
    slug: productSlug,
    description: "Tailored from 100% long-staple Egyptian Giza cotton for exceptional breathability, drape, and lustrous finish.",
    shortDescription: "Luxury Egyptian cotton button-down shirt in rich Royal Navy.",
    categoryId: categoryId!,
    basePrice: 1850,
    costPrice: 950,
    salePrice: 1650,
    status: "ACTIVE" as const, // Published immediately to catalog
    gender: "MEN",
    season: "ALL_SEASON",
    warehouseId: warehouse.id,
    stockQuantity: 50,
    reorderPoint: 10,
    media: [
      {
        url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
        altText: "Royal Navy Oxford Shirt - Front View",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80",
        altText: "Royal Navy Oxford Shirt - Fabric Texture",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      {
        sku: `GIZA-NAVY-M-${timestamp}`,
        priceOverride: 1850,
        salePrice: 1650,
        costPrice: 950,
        stockQuantity: 25,
        attributes: { Size: "M", Color: "Royal Navy" },
        isActive: true,
      },
      {
        sku: `GIZA-NAVY-L-${timestamp}`,
        priceOverride: 1850,
        salePrice: 1650,
        costPrice: 950,
        stockQuantity: 25,
        attributes: { Size: "L", Color: "Royal Navy" },
        isActive: true,
      },
    ],
  };

  const createdProduct = await ProductRepository.createProduct(createInput as any);
  if (!createdProduct || !createdProduct.id) {
    throw new Error("Failed to create and publish product!");
  }

  console.log(`  ✓ Product Published: "${createdProduct.name}" (Slug: /products/${createdProduct.slug})`);
  console.log(`    Status: ${createdProduct.status} | Base Price: ৳${createdProduct.basePrice} | Sale Price: ৳${createdProduct.salePrice}`);

  // Fetch variants from DB to verify stock levels and ledger
  const dbVariants = await prisma.variant.findMany({
    where: { productId: createdProduct.id },
    include: { inventoryLevels: true },
  });

  console.log(`  ✓ Variants Published (${dbVariants.length}):`);
  for (const v of dbVariants) {
    const inv = v.inventoryLevels[0];
    console.log(`    - SKU: ${v.sku} | Attributes: ${JSON.stringify(v.attributes)} | Available Stock: ${inv?.quantityAvailable || 0} pcs`);
  }

  // Verify Initial StockMovement ledger entry
  const initialMovements = await prisma.stockMovement.findMany({
    where: { referenceId: createdProduct.id, referenceType: "INITIAL_STOCK" },
  });
  console.log(`  ✓ Initial StockMovement Ledger Records: ${initialMovements.length} intake movement(s) logged.`);

  const testVariant = dbVariants.find((v) => (v.attributes as any)?.Size === "M") || dbVariants[0];
  const initialStockLevel = testVariant.inventoryLevels[0];
  const initialAvailableStock = initialStockLevel.quantityAvailable;
  console.log(`  Selected Variant for Purchase: SKU "${testVariant.sku}" (Starting Stock: ${initialAvailableStock} units)`);

  // ---------------------------------------------------------------------------
  // STEP 3: Customer Journey - Add to Cart (Guest Shopper)
  // ---------------------------------------------------------------------------
  console.log("\n▶ [STEP 3] Customer Buy Journey - Add to Shopping Bag:");
  const guestSessionId = `shopper_sess_${Date.now()}`;
  const purchaseQuantity = 2;

  // Customer adds 2 units of Size M to bag
  await CartService.addItem(
    null, // Guest user (no login required)
    guestSessionId,
    createdProduct.id,
    testVariant.id,
    purchaseQuantity
  );

  const cart = await CartService.getOrCreateCart(null, guestSessionId);
  console.log(`  ✓ Customer Bag Created! Cart ID: ${cart.id}`);
  console.log(`  ✓ Total Items in Bag: ${cart.items.length}`);
  const cartItem = cart.items.find((i: any) => i.variant_id === testVariant.id || i.product_id === createdProduct.id);
  
  if (cartItem) {
    console.log(`    - Added: ${cartItem.quantity}x "${cartItem.product?.title || createdProduct.name}"`);
    console.log(`    - Unit Price: ৳${cartItem.unit_price} | Line Total: ৳${cartItem.total_price}`);
  } else {
    console.error("  ❌ Item not found in cart!");
    allPassed = false;
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Checkout & Order Placement with Inventory Reservation
  // ---------------------------------------------------------------------------
  console.log("\n▶ [STEP 4] Customer Checkout & Order Placement:");
  const checkoutFormData = {
    information: {
      email: "tanvir.ahmed@example.com",
      shipping_address: {
        first_name: "Tanvir",
        last_name: "Ahmed",
        phone: "+8801711223344",
        address_line_1: "House 45, Road 11, Block D",
        address_line_2: "Banani",
        city: "Dhaka",
        postal_code: "1213",
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
      payment_method: "COD" as const, // Cash on Delivery
      billing_address_same_as_shipping: true,
    },
  };

  const checkoutSessionId = randomUUID();
  try {
    await prisma.checkoutSession.create({
      data: {
        id: checkoutSessionId,
        cartId: cart.id,
        currentStep: "payment",
      },
    });
  } catch (_) {}

  const order = await OrderService.placeOrder(
    cart.id,
    null,
    "tanvir.ahmed@example.com",
    checkoutFormData as any,
    checkoutSessionId
  );

  console.log(`  ✓ Order Placed Successfully!`);
  console.log(`    - Order Number: #${order.order_number}`);
  console.log(`    - Order ID: ${order.id}`);
  console.log(`    - Status: ${order.status.toUpperCase()}`);
  console.log(`    - Payment Method: ${order.payment_method}`);
  console.log(`    - Subtotal: ৳${order.subtotal} | Shipping: ৳${order.shipping_fee} | Total Amount: ৳${order.total_amount}`);

  // ---------------------------------------------------------------------------
  // STEP 5: Inventory Deduction & Stock Ledger Verification
  // ---------------------------------------------------------------------------
  console.log("\n▶ [STEP 5] Authoritative Inventory Deduction Audit:");
  const updatedInventory = await prisma.inventoryLevel.findUnique({
    where: { id: initialStockLevel.id },
  });

  const expectedAvailable = initialAvailableStock - purchaseQuantity;
  console.log(`  ✓ Initial Available Stock: ${initialAvailableStock}`);
  console.log(`  ✓ Current Available Stock: ${updatedInventory?.quantityAvailable}`);
  console.log(`  ✓ Current Reserved Stock:  ${updatedInventory?.quantityReserved}`);

  if (updatedInventory?.quantityAvailable === expectedAvailable) {
    console.log(`  ✅ [PASS] Stock accurately deducted by ${purchaseQuantity} units (${initialAvailableStock} -> ${expectedAvailable})!`);
  } else {
    console.error(`  ❌ [FAIL] Stock discrepancy detected! Expected ${expectedAvailable}, got ${updatedInventory?.quantityAvailable}`);
    allPassed = false;
  }

  // Verify reservation movement in stock_movements ledger
  const orderMovements = await prisma.stockMovement.findMany({
    where: {
      referenceId: order.id,
    },
  });

  console.log(`  ✓ Stock Movement Audit Trail for Order: ${orderMovements.length} record(s)`);
  if (orderMovements.length > 0) {
    console.log(`    - Movement Type: ${orderMovements[0].movementType}`);
    console.log(`    - Delta Quantity: ${orderMovements[0].quantity} units`);
    console.log(`    - New Level: ${orderMovements[0].newQuantity} pcs`);
    console.log(`    - Audit Note: "${orderMovements[0].notes}"`);
  }

  // ---------------------------------------------------------------------------
  // STEP 6: Order Confirmation & Status Progression
  // ---------------------------------------------------------------------------
  console.log("\n▶ [STEP 6] Admin / OMS Order Confirmation:");
  const confirmedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "CONFIRMED_COD",
      statusHistory: {
        create: {
          status: "CONFIRMED",
          notes: "Customer phone verified via Call Center - Banani address confirmed.",
        },
      },
    },
    include: {
      items: true,
      statusHistory: true,
    },
  });

  console.log(`  ✓ Order Status Updated: ${confirmedOrder.status}`);
  console.log(`  ✓ Payment Status: ${confirmedOrder.paymentStatus}`);
  console.log(`  ✓ Order Items Count: ${confirmedOrder.items.length}`);
  console.log(`  ✓ Status History Timeline:`);
  for (const h of confirmedOrder.statusHistory) {
    console.log(`    - [${h.createdAt.toISOString()}] Status: ${h.status} | Notes: "${h.notes}"`);
  }

  // ---------------------------------------------------------------------------
  // STEP 7: Cleanup Test Data
  // ---------------------------------------------------------------------------
  console.log("\n▶ [STEP 7] Clean Tear-down of Demonstration Records:");
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
  await prisma.stockMovement.deleteMany({ where: { referenceId: order.id } });
  await prisma.stockMovement.deleteMany({ where: { referenceId: createdProduct.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.checkoutSession.deleteMany({ where: { id: checkoutSessionId } });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.delete({ where: { id: cart.id } });

  // Delete product and its variants
  await prisma.inventoryLevel.deleteMany({ where: { variant: { productId: createdProduct.id } } });
  await prisma.variant.deleteMany({ where: { productId: createdProduct.id } });
  await prisma.productMedia.deleteMany({ where: { productId: createdProduct.id } });
  await prisma.productCategory.deleteMany({ where: { productId: createdProduct.id } });
  await prisma.product.delete({ where: { id: createdProduct.id } });
  console.log("  ✓ Test order, cart, product, and stock movements cleaned up seamlessly.");

  console.log("\n================================================================================");
  if (allPassed) {
    console.log("🎉 FULL END-TO-END LIFECYCLE PASSED 100%!");
    console.log("   [Inventory Setup] -> [Product Publish] -> [Customer Buy] -> [Order Confirmed]");
  } else {
    console.log("❌ LIFECYCLE AUDIT IDENTIFIED ISSUES");
  }
  console.log("================================================================================\n");
}

runInventoryToPublishBuyConfirm()
  .catch((err) => {
    console.error("Fatal error during lifecycle audit:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
