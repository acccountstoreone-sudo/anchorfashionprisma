import { prisma } from "../lib/prisma";
import { generateUniqueProductCode, formatVariantSku, detectApparelSystemForCategory } from "../lib/utils/product-code";

import { createInventoryMasterIntakeAction, toggleProductPublishStatusAction } from "../lib/actions/admin/inventory-master.actions";
import { CatalogRepository } from "../repositories/catalog.repository";

async function runLiveQAAudit() {
  console.log("================================================================================");
  console.log("👗 ANCHOR FASHION - COMPREHENSIVE LIVE QA TEST & FINANCIAL AUDIT");
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

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 1: Apparel Size System & Category Intelligence
  // ────────────────────────────────────────────────────────────────────────────
  console.log("📌 SUITE 1: Apparel Category & Size System Auto-Detection");
  const testCategories = [
    { name: "Polo T-Shirts", expectedSystem: "alpha", expectedSizeSample: "M" },
    { name: "Men's Slim Fit Jeans", expectedSystem: "waist", expectedSizeSample: "32" },
    { name: "Semi-Formal Cotton Trousers", expectedSystem: "waist", expectedSizeSample: "34" },
    { name: "Premium Royal Panjabi", expectedSystem: "traditional", expectedSizeSample: "40" },
    { name: "Casual Sneakers & Loafers", expectedSystem: "footwear", expectedSizeSample: "42" },
    { name: "Leather Belts & Wallets", expectedSystem: "standard", expectedSizeSample: "Free Size" },
  ];

  for (const cat of testCategories) {
    const detected = detectApparelSystemForCategory(cat.name);
    assert(
      detected.systemId === cat.expectedSystem && detected.defaultSizes.includes(cat.expectedSizeSample),
      `Auto-detection for "${cat.name}" -> System: ${detected.systemId}`,
      { detectedSystem: detected.systemId, sizes: detected.defaultSizes }
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 2: Fashion Brand Style Code & SKU Generation
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 2: Short Style Code Engine & Color-Size SKU Matrix");
  
  const code1 = await generateUniqueProductCode("Anchor Classic Polo T-Shirt", "Polo T-Shirts", "AF");
  const code2 = await generateUniqueProductCode("Men's Vintage Denim Jeans", "Jeans", "AF");
  const code3 = await generateUniqueProductCode("Anchor Royal Embroidered Panjabi", "Panjabi", "AF");

  assert(code1.startsWith("AF") && code1.length <= 8, `Polo T-Shirt Style Code: ${code1}`);
  assert(code2.startsWith("AF") && code2.length <= 8, `Denim Jeans Style Code: ${code2}`);
  assert(code3.startsWith("AF") && code3.length <= 8, `Panjabi Style Code: ${code3}`);

  // Test standard color-size SKU formatting
  const sku1 = formatVariantSku(code1, "Black", "L");
  const sku2 = formatVariantSku(code1, "Navy Blue", "XXL");
  const sku3 = formatVariantSku(code2, "Charcoal Grey", "34");

  assert(sku1 === `${code1}-BLK-L`, `Variant SKU Black/L: ${sku1}`);
  assert(sku2 === `${code1}-NB-XXL`, `Variant SKU Navy Blue/XXL: ${sku2}`);
  assert(sku3 === `${code2}-CHG-34`, `Variant SKU Charcoal Grey/34: ${sku3}`);

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 3: Merchandising Financial Calculations & Break-Even Intelligence
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 3: Merchandising Mathematics & Break-Even Audit");
  
  const basePrice = 5000; // MRP (Selling Price)
  const costPrice = 2300; // COGS (Buy / Production Cost)
  const totalBatchUnits = 100;

  const unitGrossProfit = basePrice - costPrice;
  const marginPercent = (unitGrossProfit / basePrice) * 100;
  const markupPercent = (unitGrossProfit / costPrice) * 100;
  const totalCostValuation = totalBatchUnits * costPrice;
  const totalRetailValuation = totalBatchUnits * basePrice;
  const totalProjectedProfit = totalRetailValuation - totalCostValuation;

  const breakEvenUnits = Math.ceil(totalCostValuation / basePrice);
  const breakEvenPercent = Math.round((breakEvenUnits / totalBatchUnits) * 100);
  const pureProfitUnits = totalBatchUnits - breakEvenUnits;
  const pureProfitRevenue = pureProfitUnits * basePrice;

  assert(unitGrossProfit === 2700, `Unit Gross Profit = ৳${unitGrossProfit} (5000 - 2300)`);
  assert(marginPercent === 54, `Profit Margin = ${marginPercent}% (2700 / 5000 * 100)`);
  assert(Math.round(markupPercent) === 117, `Markup = ${Math.round(markupPercent)}% (2700 / 2300 * 100)`);
  assert(totalCostValuation === 230000, `Total Cost Valuation = ৳${totalCostValuation.toLocaleString()}`);
  assert(totalRetailValuation === 500000, `Total Retail Valuation = ৳${totalRetailValuation.toLocaleString()}`);
  assert(totalProjectedProfit === 270000, `Total Projected Profit = ৳${totalProjectedProfit.toLocaleString()}`);
  assert(breakEvenUnits === 46, `Break-Even Units = ${breakEvenUnits} units (sell 46 to recover ৳230,000)`);
  assert(breakEvenPercent === 46, `Break-Even Percent = ${breakEvenPercent}% of batch`);
  assert(pureProfitUnits === 54, `Pure Profit Runway = ${pureProfitUnits} units`);
  assert(pureProfitRevenue === 270000, `Pure Profit Runway Revenue = ৳${pureProfitRevenue.toLocaleString()}`);

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 4: Master Inventory Intake Action & Barcode Allocation
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 4: Master Intake DB Persistence & EAN-13 Barcodes");

  // Get or create test category
  let testCat = await prisma.category.findFirst({
    where: { slug: "qa-test-polo-shirts" },
  });
  if (!testCat) {
    testCat = await prisma.category.create({
      data: {
        name: "QA Polo Shirts",
        slug: "qa-test-polo-shirts",
        description: "Category for automated QA testing",
      },
    });
  }

  const intakeResult = await createInventoryMasterIntakeAction({
    name: "Anchor QA Signature Polo",
    categoryId: testCat.id,
    basePrice: 4500,
    costPrice: 2000,
    totalQuantity: 60,
    skuPrefix: `QA${Math.floor(Math.random() * 900 + 100)}`,
    colorVariants: [
      {
        color: "Black",
        sizes: [
          { size: "M", quantity: 10 },
          { size: "L", quantity: 10 },
          { size: "XL", quantity: 10 },
        ],
      },
      {
        color: "Navy Blue",
        sizes: [
          { size: "M", quantity: 10 },
          { size: "L", quantity: 10 },
          { size: "XL", quantity: 10 },
        ],
      },
    ],
    publishImmediately: false, // Start as DRAFT in Inventory Master
    notes: "Automated QA Verification Batch",
  });

  assert(intakeResult.success === true, `Inventory Intake Action success: ${intakeResult.message}`);
  const createdProductId = intakeResult.data?.product?.id;
  assert(!!createdProductId, `Created Product ID: ${createdProductId}`);

  // Verify DB state
  const dbProduct = await prisma.product.findUnique({
    where: { id: createdProductId },
    include: {
      variants: {
        include: {
          inventoryLevels: true,
        },
      },
      category: true,
    },
  });

  assert(dbProduct?.status === "DRAFT", `Product starts as DRAFT in Inventory`);
  assert(Number(dbProduct?.basePrice) === 4500, `Base Price stored as ৳4,500`);
  assert(Number(dbProduct?.costPrice) === 2000, `Cost Price stored as ৳2,000`);
  assert(dbProduct?.variants.length === 6, `Color x Size Matrix created 6 variants`);

  // Verify Barcodes
  const allHaveValidEAN13 = dbProduct?.variants.every(
    (v) => v.barcode && v.barcode.length === 13 && /^\d+$/.test(v.barcode)
  );
  assert(allHaveValidEAN13 === true, `All 6 variants assigned valid 13-digit EAN-13 barcodes`);

  // Verify Total Stock
  const totalStockInDb = dbProduct?.variants.reduce(
    (acc, v) => acc + v.inventoryLevels.reduce((sub, i) => sub + i.quantityAvailable, 0),
    0
  );
  assert(totalStockInDb === 60, `Total batch stock across variants = 60 units (10 x 6)`);

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 5: Storefront Publishing & Dynamic Code Search
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 5: Publishing Flow & Catalog Resolution");

  // Step 1: Draft shouldn't show in active customer catalog
  const draftSearch = await CatalogRepository.getProducts({
    search: dbProduct!.sku!,
  });
  assert(
    !(draftSearch.data || []).some((p: any) => p.id === createdProductId),
    `DRAFT product is NOT exposed to public storefront catalog`
  );

  // Step 2: Toggle Publish to ACTIVE
  const publishToggle = await toggleProductPublishStatusAction(createdProductId!);
  assert(publishToggle.success === true, `Toggle publish status -> ACTIVE: ${publishToggle.message}`);

  const activeDbProduct = await prisma.product.findUnique({
    where: { id: createdProductId },
  });
  assert(activeDbProduct?.status === "ACTIVE", `Product status successfully updated to ACTIVE`);

  // Step 3: Now search by product SKU / Style Code
  const activeSearch = await CatalogRepository.getProducts({
    search: activeDbProduct!.sku!,
  });
  assert(
    (activeSearch.data || []).some((p: any) => p.id === createdProductId),
    `Published product found in storefront by Style Code: "${activeDbProduct!.sku}"`
  );

  // Step 4: Resolve by Product Code via getProductBySlug
  const resolvedProduct = await CatalogRepository.getProductBySlug(activeDbProduct!.sku!);
  assert(
    resolvedProduct?.id === createdProductId,
    `Direct PDP lookup by Product Code "${activeDbProduct!.sku}" resolved successfully`
  );

  // Step 5: Resolve by Variant Barcode
  const firstVariantBarcode = dbProduct?.variants[0]?.barcode;
  if (firstVariantBarcode) {
    const barcodeSearch = await CatalogRepository.getProducts({
      search: firstVariantBarcode,
    });
    assert(
      (barcodeSearch.data || []).some((p: any) => p.id === createdProductId),
      `Customer / POS search by EAN-13 Barcode "${firstVariantBarcode}" found product`
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CLEANUP: Clean up test product
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n🧹 Cleaning up QA test records...");
  await prisma.inventoryLevel.deleteMany({
    where: { variant: { productId: createdProductId } },
  });
  await prisma.variant.deleteMany({
    where: { productId: createdProductId },
  });
  await prisma.product.delete({
    where: { id: createdProductId },
  });
  console.log("  ✅ Cleaned up test product and inventory allocations");

  console.log("\n================================================================================");
  console.log(`📊 FINAL QA TEST SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("================================================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLiveQAAudit().catch((err) => {
  console.error("FATAL ERROR IN LIVE QA AUDIT:", err);
  process.exit(1);
});
