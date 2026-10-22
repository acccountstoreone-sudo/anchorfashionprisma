import { prisma } from "../lib/prisma";
import { generateUniqueProductCode, formatVariantSku, generateEAN13Barcode } from "../lib/utils/product-code";
import { ProductRepository } from "../lib/repositories/catalog/product.repository";
import { getInventoryMasterListAction, getInventoryFinancialReportAction } from "../lib/actions/admin/inventory-master.actions";

async function runBulkIntakePublishSalesTest() {
  console.log("================================================================================");
  console.log("👗 ANCHOR FASHION: BULK APPAREL INTAKE, 1-CLICK PUBLISH & SALES TRACKING TEST");
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

  try {
    // ---------------------------------------------------------------------------
    // PREREQUISITES
    // ---------------------------------------------------------------------------
    const testCategory = await prisma.category.findFirst({
      where: { isActive: true },
    });
    const testWarehouse = await prisma.warehouse.findFirst({
      where: { isActive: true },
    });

    if (!testCategory || !testWarehouse) {
      throw new Error("Missing active Category or Warehouse for testing.");
    }

    // Clean up any leftovers from previous aborted test runs
    const staleProducts = await prisma.product.findMany({
      where: { slug: { startsWith: "panjabi-batch-" } },
      select: { id: true },
    });
    if (staleProducts.length > 0) {
      const staleIds = staleProducts.map((p) => p.id);
      await prisma.orderItem.deleteMany({ where: { variant: { productId: { in: staleIds } } } });
      await prisma.inventoryLevel.deleteMany({ where: { variant: { productId: { in: staleIds } } } });
      await prisma.variant.deleteMany({ where: { productId: { in: staleIds } } });
      await prisma.product.deleteMany({ where: { id: { in: staleIds } } });
      console.log(`  🧹 Purged ${staleProducts.length} leftover test product(s).`);
    }

    console.log(`Using Category: "${testCategory.name}" and Warehouse: "${testWarehouse.name}"\n`);

    // ---------------------------------------------------------------------------
    // TEST 1: MATRIX SKU & BARCODE GENERATION (100 Units Panjabi)
    // ---------------------------------------------------------------------------
    console.log("📐 TEST 1: Style Code & Matrix Generation");

    const categoryName = "Panjabi";
    const productName = "Executive Royal Cotton Panjabi 2026";
    const basePrice = 2500;
    const costPrice = 1500;
    const totalBatchUnits = 100;

    const styleCode = await generateUniqueProductCode(productName, categoryName, "AF");
    assert(
      styleCode.startsWith("AF"),
      `Generated unique style code for bulk batch: "${styleCode}"`,
      { styleCode }
    );

    const colors = ["White", "Black", "Navy Blue", "Maroon"]; // 4 colors
    const sizes = ["38", "40", "42", "44"];                  // 4 sizes
    const totalCombinations = colors.length * sizes.length;   // 16 variants

    assert(
      totalCombinations === 16,
      `Matrix generated 16 separate variant combinations (4 colors x 4 sizes)`
    );

    // Distribute 100 units across 16 variants (12 variants with 6, 4 variants with 7 = 100)
    const baseQty = Math.floor(totalBatchUnits / totalCombinations); // 6
    const remainder = totalBatchUnits % totalCombinations;           // 4

    const variantDrafts = [];
    let allocatedTotal = 0;

    let index = 0;
    for (const color of colors) {
      for (const size of sizes) {
        const qty = baseQty + (index < remainder ? 1 : 0);
        allocatedTotal += qty;
        const vSku = formatVariantSku(styleCode, color, size);
        const barcode = generateEAN13Barcode();

        variantDrafts.push({
          sku: vSku,
          barcode,
          color,
          size,
          quantity: qty,
          costPrice,
          priceOverride: basePrice,
        });
        index++;
      }
    }

    assert(
      allocatedTotal === 100,
      `Allocated exactly 100 units across all 16 variants without unit loss`,
      { totalUnits: allocatedTotal, variantsCount: variantDrafts.length }
    );

    const sampleVariant = variantDrafts[0];
    assert(
      sampleVariant.barcode.length === 13 && sampleVariant.barcode.startsWith("894"),
      `Variant generated valid EAN-13 Bangladesh barcode: ${sampleVariant.barcode}`
    );

    // ---------------------------------------------------------------------------
    // TEST 2: BULK INTAKE TO DATABASE AS 'DRAFT'
    // ---------------------------------------------------------------------------
    console.log("\n📦 TEST 2: Database Ingestion of 100-Unit Batch (Status: DRAFT)");

    const uniqueSlug = `panjabi-batch-${Date.now()}`;
    const createdProduct = await prisma.product.create({
      data: {
        name: productName,
        slug: uniqueSlug,
        sku: styleCode,
        basePrice,
        costPrice,
        status: "DRAFT",
        categoryId: testCategory.id,
        description: "Bulk intake pending photography and storefront description.",
        variants: {
          create: variantDrafts.map((v) => ({
            sku: v.sku,
            barcode: v.barcode,
            costPrice: v.costPrice,
            priceOverride: v.priceOverride,
            attributes: { Color: v.color, Size: v.size },
            isActive: true,
            inventoryLevels: {
              create: {
                warehouseId: testWarehouse.id,
                quantityAvailable: v.quantity,
                quantityReserved: 0,
              },
            },
          })),
        },
      },
      include: {
        variants: {
          include: { inventoryLevels: true },
        },
      },
    });

    assert(
      createdProduct.status === "DRAFT",
      `Batch intake successfully committed with status DRAFT (#${createdProduct.sku})`
    );
    assert(
      createdProduct.variants.length === 16,
      `All 16 variants ingested into database linked to master product`
    );

    const totalIngestedStock = createdProduct.variants.reduce((acc, v) => {
      const q = v.inventoryLevels.reduce((iq, l) => iq + l.quantityAvailable, 0);
      return acc + q;
    }, 0);

    assert(
      totalIngestedStock === 100,
      `Total warehouse inventory level confirmed at exactly 100 units`
    );

    // ---------------------------------------------------------------------------
    // TEST 3: VERIFY INVENTORY MASTER HUB METRICS (BEFORE SALES)
    // ---------------------------------------------------------------------------
    console.log("\n📊 TEST 3: Master Hub Action & Sell-Through Calculations (Zero Sales)");

    const masterListResponse = await getInventoryMasterListAction({
      search: styleCode,
      status: "ALL",
      limit: 10,
    });

    assert(
      masterListResponse.success === true,
      `getInventoryMasterListAction returned success: true`
    );

    const masterItem = masterListResponse.data?.items?.find((i: any) => i.id === createdProduct.id);
    assert(
      !!masterItem,
      `Master Hub query successfully retrieved batch item (#${styleCode})`
    );

    if (masterItem) {
      assert(
        masterItem.totalAvailable === 100,
        `Master Hub available stock matches intake: ${masterItem.totalAvailable} units`
      );
      assert(
        masterItem.totalSold === 0,
        `Master Hub units sold starts at 0 units`
      );
      assert(
        masterItem.sellThroughRate === 0,
        `Sell-through rate starts at 0%`
      );
      assert(
        masterItem.variants.length === 16,
        `Master Hub returns all 16 variants for breakdown table`
      );
    }

    // ---------------------------------------------------------------------------
    // TEST 4: 1-CLICK PUBLISH TO STOREFRONT (DRAFT -> ACTIVE WITH ASSETS)
    // ---------------------------------------------------------------------------
    console.log("\n🚀 TEST 4: Storefront Publishing Transition (Simulating Product Studio Form)");

    // Before publish: verify hidden from active storefront catalog
    const storefrontBefore = await ProductRepository.getProducts({
      search: styleCode,
      status: "ACTIVE",
      limit: 5,
    });
    const isVisibleBefore = storefrontBefore.products.some((p: any) => p.id === createdProduct.id);
    assert(
      !isVisibleBefore,
      `Draft batch is correctly hidden from public storefront catalog`
    );

    // Simulate ProductForm submit with images, rich description, and ACTIVE status
    const publishedProduct = await prisma.product.update({
      where: { id: createdProduct.id },
      data: {
        status: "ACTIVE",
        description: "Exclusive Premium Festive Cotton Panjabi featuring gold thread collar embroidery.",
        imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80",
        ],
      },
    });

    assert(
      publishedProduct.status === "ACTIVE",
      `Batch transitioned to ACTIVE with storefront imagery and detailed copy`
    );

    // After publish: verify immediately visible on active storefront catalog
    const storefrontAfter = await ProductRepository.getProducts({
      search: styleCode,
      status: "ACTIVE",
      limit: 5,
    });
    const isVisibleAfter = storefrontAfter.products.some((p: any) => p.id === createdProduct.id);
    assert(
      isVisibleAfter,
      `Product is now LIVE, searchable, and published on customer storefront!`
    );

    // ---------------------------------------------------------------------------
    // TEST 5: SIMULATE SALES & ORDERS (TRACK UNITS SOLD IN REAL-TIME)
    // ---------------------------------------------------------------------------
    console.log("\n🛒 TEST 5: Real-time Sales Tracking Across Variants");

    const white40Variant = createdProduct.variants.find(
      (v) => (v.attributes as any)?.Color === "White" && (v.attributes as any)?.Size === "40"
    )!;
    const black42Variant = createdProduct.variants.find(
      (v) => (v.attributes as any)?.Color === "Black" && (v.attributes as any)?.Size === "42"
    )!;
    const navy38Variant = createdProduct.variants.find(
      (v) => (v.attributes as any)?.Color === "Navy Blue" && (v.attributes as any)?.Size === "38"
    )!;

    const mockShippingAddress = {
      fullName: "QA Test Customer",
      phoneNumber: "01711000000",
      address: "House 12, Road 4, Dhanmondi",
      city: "Dhaka",
      zone: "Dhaka Metro",
    };

    // Create a completed customer order (PAID)
    const paidOrder = await prisma.order.create({
      data: {
        orderNumber: `QA-ORD-${Date.now()}`,
        status: "DELIVERED",
        paymentStatus: "PAID",
        paymentMethod: "BKASH",
        totalAmount: 2500 * 10,
        subtotal: 2500 * 10,
        shippingFee: 0,
        shippingAddress: mockShippingAddress,
        items: {
          create: [
            {
              productId: createdProduct.id,
              variantId: white40Variant.id,
              productName,
              sku: white40Variant.sku,
              quantity: 5, // 5 units sold
              unitPrice: 2500,
              totalPrice: 12500,
            },
            {
              productId: createdProduct.id,
              variantId: black42Variant.id,
              productName,
              sku: black42Variant.sku,
              quantity: 3, // 3 units sold
              unitPrice: 2500,
              totalPrice: 7500,
            },
            {
              productId: createdProduct.id,
              variantId: navy38Variant.id,
              productName,
              sku: navy38Variant.sku,
              quantity: 2, // 2 units sold
              unitPrice: 2500,
              totalPrice: 5000,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Also create a CANCELLED order to verify cancelled orders do NOT inflate sold metrics
    const cancelledOrder = await prisma.order.create({
      data: {
        orderNumber: `QA-ORD-CANCEL-${Date.now()}`,
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
        paymentMethod: "COD",
        totalAmount: 2500 * 4,
        subtotal: 2500 * 4,
        shippingFee: 0,
        shippingAddress: mockShippingAddress,
        items: {
          create: [
            {
              productId: createdProduct.id,
              variantId: white40Variant.id,
              productName,
              sku: white40Variant.sku,
              quantity: 4, // 4 units cancelled - MUST NOT BE COUNTED
              unitPrice: 2500,
              totalPrice: 10000,
            },
          ],
        },
      },
      include: { items: true },
    });

    assert(
      paidOrder.items.length === 3,
      `Paid order created with 10 total units sold (5 White-40, 3 Black-42, 2 Navy-38)`
    );
    assert(
      cancelledOrder.status === "CANCELLED",
      `Cancelled order created with 4 units (should be ignored by sales analytics)`
    );

    // ---------------------------------------------------------------------------
    // TEST 6: VERIFY SALES QUANTITIES ON PRODUCT REPOSITORY & MASTER ACTIONS
    // ---------------------------------------------------------------------------
    console.log("\n📈 TEST 6: Validation of Sales Metrics in UI & Backend Models");

    // Check ProductRepository.getProductById
    const repoProduct = await ProductRepository.getProductById(createdProduct.id);
    assert(
      repoProduct !== null,
      `ProductRepository found product by ID`
    );

    if (repoProduct) {
      assert(
        (repoProduct as any).soldCount === 10 || (repoProduct as any).totalSold === 10,
        `Product-level totalSold / soldCount correctly aggregates 10 units (cancelled orders excluded)`,
        { soldCount: (repoProduct as any).soldCount, totalSold: (repoProduct as any).totalSold }
      );

      const repoWhite40 = repoProduct.variants?.find((v: any) => v.id === white40Variant.id);
      assert(
        (repoWhite40 as any)?.soldQuantity === 5,
        `Variant White-40 reports exactly 5 sold units`,
        { soldQuantity: (repoWhite40 as any)?.soldQuantity }
      );

      const repoBlack42 = repoProduct.variants?.find((v: any) => v.id === black42Variant.id);
      assert(
        (repoBlack42 as any)?.soldQuantity === 3,
        `Variant Black-42 reports exactly 3 sold units`,
        { soldQuantity: (repoBlack42 as any)?.soldQuantity }
      );
    }

    // Check Inventory Master Hub Action
    const masterAfterSales = await getInventoryMasterListAction({
      search: styleCode,
      status: "ALL",
      limit: 10,
    });

    const itemAfterSales = masterAfterSales.data?.items?.find((i: any) => i.id === createdProduct.id);
    assert(
      itemAfterSales?.totalSold === 10,
      `Master Hub confirms totalSold = 10 units`,
      { totalSold: itemAfterSales?.totalSold }
    );
    assert(
      itemAfterSales?.totalSoldRevenue === 25000,
      `Master Hub calculates ৳25,000 realized sales revenue (10 x ৳2,500)`
    );
    assert(
      Math.round(itemAfterSales?.sellThroughRate || 0) >= 9 && Math.round(itemAfterSales?.sellThroughRate || 0) <= 10,
      `Master Hub computes sell-through rate accurately (~9-10%)`,
      { sellThroughRate: `${itemAfterSales?.sellThroughRate}%` }
    );

    // Check Financial Report Action
    const financialReport = await getInventoryFinancialReportAction();
    assert(
      financialReport.success === true,
      `Financial Report action succeeded`
    );
    assert(
      (financialReport.data?.summary?.totalSoldUnits ?? 0) >= 10,
      `Financial Report aggregated sold units in system (${financialReport.data?.summary?.totalSoldUnits} units)`
    );

    // ---------------------------------------------------------------------------
    // TEST 7: CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n🧹 TEST 7: Test Data Teardown & Database Cleanliness");

    // Delete order items & orders
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [paidOrder.id, cancelledOrder.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [paidOrder.id, cancelledOrder.id] } },
    });

    // Delete inventory levels & variants
    await prisma.inventoryLevel.deleteMany({
      where: { variant: { productId: createdProduct.id } },
    });
    await prisma.variant.deleteMany({
      where: { productId: createdProduct.id },
    });
    await prisma.product.delete({
      where: { id: createdProduct.id },
    });

    console.log("  ✅ Test orders, variants, and product cleanly removed from database.");

  } catch (error: any) {
    console.error("❌ Test crashed with exception:", error.message, error.stack);
  }

  console.log("\n================================================================================");
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests || totalTests === 0) {
    process.exit(1);
  }
}

runBulkIntakePublishSalesTest();
