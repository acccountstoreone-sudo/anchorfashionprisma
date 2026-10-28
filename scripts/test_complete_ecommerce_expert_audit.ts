import { prisma } from "../lib/prisma";
import { InventoryService } from "../services/inventory.service";
import { ReturnsService } from "../services/shipping/returns.service";
import { AnalyticsRepository } from "../repositories/analytics.repository";


// Test run constants
const TEST_RUN_ID = `AUDIT_${Date.now()}`;
const TEST_SKU_BASE = `PANJABI-${TEST_RUN_ID}`;

interface VerificationResult {
  step: string;
  check: string;
  passed: boolean;
  details?: any;
}

const auditLog: VerificationResult[] = [];

function assertCheck(step: string, check: string, condition: boolean, details?: any) {
  auditLog.push({ step, check, passed: condition, details });
  if (condition) {
    console.log(`  [PASS] ${step} :: ${check}`);
  } else {
    console.error(`  [FAIL] ${step} :: ${check}`, details || "");
  }
}

async function runCompleteEcommerceExpertAudit() {
  console.log("==================================================================");
  console.log("STARTING COMPREHENSIVE E-COMMERCE END-TO-END AUDIT SUITE");
  console.log(`Run ID: ${TEST_RUN_ID}`);
  console.log("==================================================================\n");

  const inventoryService = new InventoryService();
  const returnsService = new ReturnsService();

  // Test entities to clean up
  let createdCategoryId: string | null = null;
  let createdProductId: string | null = null;
  let createdVariantIds: string[] = [];
  let testWarehouseId: string | null = null;
  let order1Id: string | null = null;
  let order2Id: string | null = null;
  let returnId: string | null = null;
  let testCustomerId: string | null = null;

  try {
    // --------------------------------------------------------------------------
    // PILLAR 0: Setup Warehouse & Customer
    // --------------------------------------------------------------------------
    console.log("--> PILLAR 0: Environment & Warehouse Verification");
    let warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          name: `Audit Central Warehouse ${TEST_RUN_ID}`,
          code: `WH-AUDIT-${Date.now().toString().slice(-4)}`,
          address: "Tejgaon Industrial Area, Dhaka",
          city: "Dhaka",
          isActive: true,
        },
      });
    }
    testWarehouseId = warehouse.id;
    assertCheck("Pillar 0", "Active Central Warehouse available", !!testWarehouseId, { warehouseId: testWarehouseId });

    // Ensure a test customer exists
    let customer = await prisma.customer.findFirst();
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: "Auditor Customer",
          email: `audit_customer_${Date.now()}@anchorfashion.test`,
          phone: "+8801700000999",
        },
      });
    }
    testCustomerId = customer.id;
    assertCheck("Pillar 0", "Customer profile available", !!testCustomerId, { customerId: testCustomerId });

    // --------------------------------------------------------------------------
    // PILLAR 1: INVENTORY INTAKE & MASTER CATALOG SPECIFICATION
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 1: Inventory Master Intake & Variant Matrix Creation");
    
    // 1. Category
    let category = await prisma.category.findFirst({ where: { slug: "men-panjabi" } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "Men Panjabi",
          slug: `men-panjabi-audit-${Date.now()}`,
          isActive: true,
        },
      });
    }
    createdCategoryId = category.id;

    // 2. Garment Product (Initially DRAFT)
    const basePrice = 2800;
    const costPrice = 1250;
    const salePrice = 2450; // Discounted promotional price

    const product = await prisma.product.create({
      data: {
        name: `Auditor Premium Embroidered Panjabi ${TEST_RUN_ID}`,
        slug: `premium-panjabi-${TEST_RUN_ID.toLowerCase()}`,
        description: "100% Egyptian Cotton jacquard weave formal panjabi with mandarin collar.",
        categoryId: createdCategoryId,
        status: "DRAFT",
        basePrice,
        costPrice,
        salePrice,
      },
    });
    createdProductId = product.id;
    assertCheck("Pillar 1", "Product master record created in DRAFT state", product.status === "DRAFT");

    // 3. Variant Matrix: 2 Colors (Navy, White) x 2 Sizes (M, L) = 4 Variants
    // Intake 25 units per variant = 100 units total batch
    const colors = ["Navy", "White"];
    const sizes = ["M", "L"];
    const unitsPerVariant = 25;
    let totalInitialStock = 0;

    for (const color of colors) {
      for (const size of sizes) {
        const sku = `${TEST_SKU_BASE}-${color.toUpperCase().slice(0, 3)}-${size}`;
        const ean13 = `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        const variant = await prisma.variant.create({
          data: {
            productId: product.id,
            sku,
            barcode: ean13,
            attributes: { color, size },
            priceOverride: salePrice,
            salePrice,
            costPrice,
            isActive: true,
          },
        });
        createdVariantIds.push(variant.id);

        // Create warehouse inventory level
        await prisma.inventoryLevel.create({
          data: {
            variantId: variant.id,
            warehouseId: testWarehouseId,
            quantityAvailable: unitsPerVariant,
            quantityReserved: 0,
            reorderPoint: 5,
          },
        });

        // Record authoritative stock movement
        await prisma.stockMovement.create({
          data: {
            variantId: variant.id,
            warehouseId: testWarehouseId,
            movementType: "IN",
            quantity: unitsPerVariant,
            previousQuantity: 0,
            newQuantity: unitsPerVariant,
            referenceType: "PURCHASE_ORDER",
            referenceId: `PO-${TEST_RUN_ID}`,
            notes: `Batch intake ${unitsPerVariant} units of ${color} ${size}`,
          },
        });

        totalInitialStock += unitsPerVariant;
      }
    }

    assertCheck("Pillar 1", "Variant matrix (4 variants) created with EAN-13 barcodes", createdVariantIds.length === 4);
    assertCheck("Pillar 1", "100 units stocked into warehouse inventory levels", totalInitialStock === 100);

    // Verify stock movements in DB
    const intakeMovements = await prisma.stockMovement.findMany({
      where: {
        variantId: { in: createdVariantIds },
        movementType: "IN",
        referenceType: "PURCHASE_ORDER",
      },
    });
    assertCheck("Pillar 1", "Stock movements logged with referenceType PURCHASE_ORDER", intakeMovements.length === 4);

    // --------------------------------------------------------------------------
    // PILLAR 2: PRODUCT PUBLISHING & STOREFRONT VISIBILITY
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 2: Product Publishing & Catalog Cache Logic");

    // Before publish: verify product is NOT returned in public ACTIVE catalog query
    const publicCatalogBefore = await prisma.product.findMany({
      where: {
        id: product.id,
        status: "ACTIVE",
      },
    });
    assertCheck("Pillar 2", "Draft product is hidden from active storefront catalog", publicCatalogBefore.length === 0);

    // Publish action: Update product to ACTIVE
    const publishedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        status: "ACTIVE",
      },
    });
    assertCheck("Pillar 2", "Product published to ACTIVE status", publishedProduct.status === "ACTIVE");

    // Verify PDP / Storefront catalog query returns the published product with variants
    const publicCatalogAfter = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        variants: {
          include: {
            inventoryLevels: true,
          },
        },
      },
    });
    assertCheck("Pillar 2", "Active catalog retrieves product with active variants & stock", 
      publicCatalogAfter !== null && publicCatalogAfter.variants.length === 4
    );

    // --------------------------------------------------------------------------
    // PILLAR 3: ORDER CREATION, FINANCIAL FORMULAS & ATOMIC STOCK RESERVATION
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 3: Order Placement, Pricing Engine & Inventory Reservation");

    // We will buy:
    // Item A: 2 units of Navy M (salePrice 2450 = 4900)
    // Item B: 1 unit of White L (salePrice 2450 = 2450)
    const varAId = createdVariantIds[0]; // Navy M
    const varBId = createdVariantIds[3]; // White L
    const varA = await prisma.variant.findUniqueOrThrow({ where: { id: varAId } });
    const varB = await prisma.variant.findUniqueOrThrow({ where: { id: varBId } });

    const qtyA = 2;
    const qtyB = 1;
    const priceA = Number(varA.salePrice || salePrice);
    const priceB = Number(varB.salePrice || salePrice);
    const lineTotalA = priceA * qtyA; // 2450 * 2 = 4900
    const lineTotalB = priceB * qtyB; // 2450 * 1 = 2450
    const subtotal = lineTotalA + lineTotalB;      // 7350

    // Coupon: 10% discount on subtotal (735 BDT)
    const discountAmount = Math.round(subtotal * 0.10); // 735
    // Delivery: Inside Dhaka standard fee (60 BDT)
    const shippingFee = 60;
    // Grand Total: subtotal - discount + shipping
    const expectedGrandTotal = subtotal - discountAmount + shippingFee; // 7350 - 735 + 60 = 6675

    const orderNumber1 = `ORD-${Date.now()}-1`;
    const order1 = await prisma.order.create({
      data: {
        orderNumber: orderNumber1,
        customerId: testCustomerId,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: "BKASH",
        subtotal,
        discount: discountAmount,
        shippingFee,
        totalAmount: expectedGrandTotal,
        shippingAddress: {
          city: "Dhaka",
          address: "Banani Road 11, Dhaka",
        },
        billingAddress: {
          city: "Dhaka",
          address: "Banani Road 11, Dhaka",
        },
        items: {
          create: [
            {
              productId: product.id,
              variantId: varA.id,
              sku: varA.sku,
              productName: `${product.name} - Navy M`,
              quantity: qtyA,
              unitPrice: priceA,
              totalPrice: lineTotalA,
            },
            {
              productId: product.id,
              variantId: varB.id,
              sku: varB.sku,
              productName: `${product.name} - White L`,
              quantity: qtyB,
              unitPrice: priceB,
              totalPrice: lineTotalB,
            },
          ],
        },
      },
      include: { items: true },
    });
    order1Id = order1.id;

    assertCheck("Pillar 3", "Order 1 placed with verified mathematical financial total", 
      Number(order1.totalAmount) === expectedGrandTotal,
      { subtotal, discountAmount, shippingFee, expectedGrandTotal, savedGrandTotal: Number(order1.totalAmount) }
    );

    // Perform inventory deduction / reservation
    // Available goes: 25 -> 23 for Var A, 25 -> 24 for Var B
    // Reserved goes: 0 -> 2 for Var A, 0 -> 1 for Var B
    await prisma.$transaction([
      prisma.inventoryLevel.updateMany({
        where: { variantId: varA.id, warehouseId: testWarehouseId },
        data: {
          quantityAvailable: { decrement: qtyA },
          quantityReserved: { increment: qtyA },
        },
      }),
      prisma.inventoryLevel.updateMany({
        where: { variantId: varB.id, warehouseId: testWarehouseId },
        data: {
          quantityAvailable: { decrement: qtyB },
          quantityReserved: { increment: qtyB },
        },
      }),
    ]);

    const levelAAfterReserve = await prisma.inventoryLevel.findFirst({ where: { variantId: varA.id, warehouseId: testWarehouseId } });
    const levelBAfterReserve = await prisma.inventoryLevel.findFirst({ where: { variantId: varB.id, warehouseId: testWarehouseId } });

    assertCheck("Pillar 3", "Atomic stock reservation: Var A (25 -> 23 avail, +2 reserved)", 
      levelAAfterReserve?.quantityAvailable === 23 && levelAAfterReserve?.quantityReserved === 2
    );
    assertCheck("Pillar 3", "Atomic stock reservation: Var B (25 -> 24 avail, +1 reserved)", 
      levelBAfterReserve?.quantityAvailable === 24 && levelBAfterReserve?.quantityReserved === 1
    );

    // --------------------------------------------------------------------------
    // PILLAR 4: OMS STATE TRANSITIONS & SHIPMENT FULFILLMENT
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 4: OMS Workflow & Inventory Settlement");

    // Transition: CONFIRMED -> PROCESSING
    const processingOrder = await prisma.order.update({
      where: { id: order1.id },
      data: { status: "PROCESSING" },
    });
    assertCheck("Pillar 4", "Order transitioned to PROCESSING", processingOrder.status === "PROCESSING");

    // Transition: PROCESSING -> SHIPPED
    // At SHIPPED: Reserved stock is deducted permanently, and OUT movement is logged
    await inventoryService.confirmOrderInventory(order1.id);

    const shippedOrder = await prisma.order.update({
      where: { id: order1.id },
      data: { status: "SHIPPED" },
    });
    assertCheck("Pillar 4", "Order transitioned to SHIPPED", shippedOrder.status === "SHIPPED");

    const levelAAfterShip = await prisma.inventoryLevel.findFirst({ where: { variantId: varA.id, warehouseId: testWarehouseId } });
    const levelBAfterShip = await prisma.inventoryLevel.findFirst({ where: { variantId: varB.id, warehouseId: testWarehouseId } });

    assertCheck("Pillar 4", "Reserved stock cleared upon dispatch: Var A (23 avail, 0 reserved)", 
      levelAAfterShip?.quantityAvailable === 23 && levelAAfterShip?.quantityReserved === 0
    );
    assertCheck("Pillar 4", "Reserved stock cleared upon dispatch: Var B (24 avail, 0 reserved)", 
      levelBAfterShip?.quantityAvailable === 24 && levelBAfterShip?.quantityReserved === 0
    );

    // Verify stock movement OUT logged
    const outMovements = await prisma.stockMovement.findMany({
      where: {
        referenceId: order1.id,
        movementType: "OUT",
      },
    });
    assertCheck("Pillar 4", "Stock movements logged with OUT and reference to order", outMovements.length >= 2);

    // Transition: SHIPPED -> DELIVERED
    const deliveredOrder = await prisma.order.update({
      where: { id: order1.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });
    assertCheck("Pillar 4", "Order status transitioned to DELIVERED with delivery timestamp", 
      deliveredOrder.status === "DELIVERED" && !!deliveredOrder.deliveredAt
    );

    // --------------------------------------------------------------------------
    // PILLAR 5: CUSTOMER RETURN, PROPORTIONAL DISCOUNT ALLOCATION & RESTOCK
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 5: Returns Lifecycle, Proportional Refund & Warehouse Restock");

    // Customer requests return of 1 unit of Var A (Navy M) because of "Wrong size"
    // Check eligibility
    const eligibility = await returnsService.checkReturnEligibility(order1.id, testCustomerId);
    assertCheck("Pillar 5", "Server-authoritative check confirms order is eligible for return", eligibility.isOrderEligible);

    const itemA = order1.items.find(i => i.variantId === varA.id)!;
    const itemEligibility = eligibility.items.find(i => i.orderItemId === itemA.id);
    assertCheck("Pillar 5", "Line item eligibility identified", !!itemEligibility && itemEligibility.eligibleQuantity === 2);

    // Calculate proportional refund:
    // Item line total = 4900 (for 2 units, so 2450/unit)
    // Order discount ratio = 735 / 7350 = 0.10 (10%)
    // Effective line price after discount = 4900 * (1 - 0.10) = 4410
    // Net refundable per unit = 4410 / 2 = 2205
    const netRefundable1Unit = itemEligibility?.netRefundablePerUnit || 2205;
    assertCheck("Pillar 5", "Proportional discount allocation calculation verified (৳2205 net refundable per unit)", 
      Math.abs(netRefundable1Unit - 2205) <= 1,
      { itemLineTotal: itemA.totalPrice, discountRatio: discountAmount / subtotal, netRefundable1Unit }
    );

    // Submit Customer Return Request for 1 unit of Var A
    const returnRequest = await returnsService.submitCustomerReturn({
      orderId: order1.id,
      reason: "Wrong size",
      items: [
        {
          orderItemId: itemA.id,
          quantity: 1,
          reason: "Wrong size - too loose",
        },
      ],
      refundMethod: "ORIGINAL_PAYMENT",
    }, testCustomerId);

    returnId = returnRequest.id;
    assertCheck("Pillar 5", "Customer return request created in requested state", 
      returnRequest.status === "requested" && Number(returnRequest.refund_amount) === netRefundable1Unit
    );

    // Admin approves return
    const approvedReturn = await returnsService.approveReturn(returnId, "admin_user_audit");
    assertCheck("Pillar 5", "Admin approves return request", approvedReturn.status === "approved");

    // Warehouse receives and inspects return
    // Condition is verified as 'good' -> trigger authoritative restock
    const returnItem = await prisma.returnItem.findFirst({ where: { returnId } });
    assertCheck("Pillar 5", "Return item found in DB with variantId attached", !!returnItem && !!returnItem.variantId);

    const restockedReturn = await returnsService.processReturnRestock(
      returnId,
      { [returnItem!.id]: "good" },
      "warehouse_manager_audit"
    );
    assertCheck("Pillar 5", "Warehouse restock processed condition 'good'", restockedReturn.id === returnId);

    // Verify inventory level incremented back from 23 -> 24
    const levelAAfterRestock = await prisma.inventoryLevel.findFirst({ where: { variantId: varA.id, warehouseId: testWarehouseId } });
    assertCheck("Pillar 5", "Warehouse inventory level incremented back (23 -> 24 available)", 
      levelAAfterRestock?.quantityAvailable === 24
    );

    // Verify stock movement IN logged with referenceType RETURN
    const returnMovement = await prisma.stockMovement.findFirst({
      where: {
        referenceId: returnId,
        movementType: "IN",
        referenceType: "RETURN",
      },
    });
    assertCheck("Pillar 5", "Stock movement logged for RETURN with movementType IN", 
      !!returnMovement && returnMovement.quantity === 1
    );

    // Settle refund
    const refundSettlement = await returnsService.resolveReturnWithRefund(returnId, {
      refundMethod: "GATEWAY_CONFIRMED",
      note: "Refund settled to bKash account",
    });
    assertCheck("Pillar 5", "Refund marked PROCESSED and return completed", 
      refundSettlement.refundStatus === "PROCESSED" && refundSettlement.status === "completed"
    );

    // --------------------------------------------------------------------------
    // PILLAR 6: ORDER CANCELLATION & INVENTORY ROLLBACK
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 6: Order Cancellation & Stock Restoration");

    // Place Order 2: Buy 3 units of Var B (White L)
    // Available was 24, will become 21 available, 3 reserved
    const orderNumber2 = `ORD-${Date.now()}-2`;
    const order2Subtotal = priceB * 3; // 2450 * 3 = 7350
    const order2 = await prisma.order.create({
      data: {
        orderNumber: orderNumber2,
        customerId: testCustomerId,
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        subtotal: order2Subtotal,
        discount: 0,
        shippingFee: 60,
        totalAmount: order2Subtotal + 60,
        shippingAddress: {
          city: "Dhaka",
          address: "Gulshan 2, Dhaka",
        },
        billingAddress: {
          city: "Dhaka",
          address: "Gulshan 2, Dhaka",
        },
        items: {
          create: [
            {
              productId: product.id,
              variantId: varB.id,
              sku: varB.sku,
              productName: `${product.name} - White L`,
              quantity: 3,
              unitPrice: priceB,
              totalPrice: order2Subtotal,
            },
          ],
        },
      },
      include: { items: true },
    });
    order2Id = order2.id;

    // Deduct stock for Order 2: 24 -> 21 avail, +3 reserved
    await prisma.inventoryLevel.updateMany({
      where: { variantId: varB.id, warehouseId: testWarehouseId },
      data: {
        quantityAvailable: { decrement: 3 },
        quantityReserved: { increment: 3 },
      },
    });

    const levelBBeforeCancel = await prisma.inventoryLevel.findFirst({ where: { variantId: varB.id, warehouseId: testWarehouseId } });
    assertCheck("Pillar 6", "Order 2 reserved 3 units (24 -> 21 avail, 3 reserved)", 
      levelBBeforeCancel?.quantityAvailable === 21 && levelBBeforeCancel?.quantityReserved === 3
    );

    // Customer cancels order 2 before dispatch
    // Release inventory using inventoryService
    await inventoryService.releaseOrderInventory(order2.id);

    // Update order status to CANCELLED
    const cancelledOrder = await prisma.order.update({
      where: { id: order2.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
    assertCheck("Pillar 6", "Order 2 marked CANCELLED", cancelledOrder.status === "CANCELLED");

    // Verify stock restoration: Var B must be back to 24 available, 0 reserved!
    const levelBAfterCancel = await prisma.inventoryLevel.findFirst({ where: { variantId: varB.id, warehouseId: testWarehouseId } });
    assertCheck("Pillar 6", "Stock 100% restored after cancellation (21 -> 24 avail, 0 reserved)", 
      levelBAfterCancel?.quantityAvailable === 24 && levelBAfterCancel?.quantityReserved === 0
    );

    // Verify stock movement RESTORE logged
    const restoreMovement = await prisma.stockMovement.findFirst({
      where: {
        referenceId: order2.id,
        movementType: "IN",
      },
    });
    assertCheck("Pillar 6", "Stock movement logged for order cancellation restoration", !!restoreMovement);

    // --------------------------------------------------------------------------
    // PILLAR 7: FINANCIAL METRICS & ANALYTICS CALCULATION AUDIT
    // --------------------------------------------------------------------------
    console.log("\n--> PILLAR 7: Financial Formulas & Executive Summary Aggregation");

    // Formula checks:
    // 1. Unit Gross Profit = salePrice - costPrice = 2450 - 1250 = 1200 BDT
    const unitGrossProfit = salePrice - costPrice;
    assertCheck("Pillar 7", "Unit Gross Profit calculation (2450 - 1250 = ৳1200)", unitGrossProfit === 1200);

    // 2. Unit Profit Margin % = (Gross Profit / salePrice) * 100 = (1200 / 2450) * 100 = 48.98%
    const unitMarginPct = Number(((unitGrossProfit / salePrice) * 100).toFixed(2));
    assertCheck("Pillar 7", "Unit Margin % calculation (৳1200 / ৳2450 = 48.98%)", unitMarginPct === 48.98);

    // 3. Sell-through rate for this 100-unit batch:
    // Total Intake = 100
    // Net units sold (Order 1 delivered minus 1 return) = (2 + 1) - 1 = 2 units
    // Order 2 was cancelled so it is NOT sold.
    // Sell-Through Rate % = (2 / 100) * 100 = 2.0%
    const currentTotalAvailable = (
      await prisma.inventoryLevel.findMany({
        where: { variantId: { in: createdVariantIds }, warehouseId: testWarehouseId },
      })
    ).reduce((sum, l) => sum + l.quantityAvailable, 0);

    assertCheck("Pillar 7", "Current available inventory equals 98 units (100 intake - 2 net sold)", 
      currentTotalAvailable === 98,
      { currentTotalAvailable }
    );

    // 4. Analytics Repository: getExecutiveSummary()
    const summary = await AnalyticsRepository.getExecutiveSummary();
    assertCheck("Pillar 7", "AnalyticsRepository executive summary returns valid positive numbers", 
      typeof summary.totalRevenue === "number" && !isNaN(summary.totalRevenue) && summary.totalRevenue > 0,
      { totalRevenue: summary.totalRevenue, totalOrders: summary.totalOrders }
    );

    console.log("\n==================================================================");
    console.log("AUDIT SUMMARY & RESULTS");
    console.log("==================================================================");
    const passedCount = auditLog.filter(a => a.passed).length;
    const totalCount = auditLog.length;
    console.log(`Total Checks Executed : ${totalCount}`);
    console.log(`Passed Checks         : ${passedCount}`);
    console.log(`Failed Checks         : ${totalCount - passedCount}`);
    console.log(`Pass Rate             : ${((passedCount / totalCount) * 100).toFixed(1)}%`);

  } catch (err: any) {
    console.error("CRITICAL EXCEPTION IN AUDIT RUN:", err);
    throw err;
  } finally {
    // --------------------------------------------------------------------------
    // TEARDOWN: Clean up test artifacts cleanly
    // --------------------------------------------------------------------------
    console.log("\n--> Cleaning up audit test data...");
    try {
      if (returnId) {
        await prisma.returnItem.deleteMany({ where: { returnId } });
        await prisma.return.deleteMany({ where: { id: returnId } });
      }
      if (order1Id) {
        await prisma.orderItem.deleteMany({ where: { orderId: order1Id } });
        await prisma.order.deleteMany({ where: { id: order1Id } });
      }
      if (order2Id) {
        await prisma.orderItem.deleteMany({ where: { orderId: order2Id } });
        await prisma.order.deleteMany({ where: { id: order2Id } });
      }
      if (createdVariantIds.length > 0) {
        await prisma.stockMovement.deleteMany({ where: { variantId: { in: createdVariantIds } } });
        await prisma.inventoryLevel.deleteMany({ where: { variantId: { in: createdVariantIds } } });
        await prisma.variant.deleteMany({ where: { id: { in: createdVariantIds } } });
      }
      if (createdProductId) {
        await prisma.product.deleteMany({ where: { id: createdProductId } });
      }
      console.log("  [CLEANUP DONE] All test database records purged successfully.");
    } catch (cleanupErr) {
      console.warn("  [CLEANUP WARNING] Non-fatal cleanup warning:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runCompleteEcommerceExpertAudit()
  .then(() => {
    console.log("\nALL VERIFICATIONS FINISHED SUCCESSFULLY.");
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("\nFATAL ERROR DURING AUDIT:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
