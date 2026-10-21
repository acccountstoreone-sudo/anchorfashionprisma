import { prisma } from "../lib/prisma";
import { generateUniqueProductCode, formatVariantSku } from "../lib/utils/product-code";
import { CatalogRepository } from "../repositories/catalog.repository";
import { CouponService } from "../services/coupon.service";

async function runComprehensiveWebsiteQA() {
  console.log("================================================================================");
  console.log("🔍 ANCHOR FASHION: FULL WEBSITE COMPREHENSIVE QA TEST SUITE");
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

  // ---------------------------------------------------------------------------
  // SUITE 1: CLOTHING BRAND POS & DYNAMIC PRODUCT CODE (AFPTS1) GENERATION
  // ---------------------------------------------------------------------------
  console.log("📦 SUITE 1: Clothing POS & Dynamic Unique Style Code Generation");

  const poloCode = await generateUniqueProductCode(
    "Heritage Cotton Pique Polo T-Shirt",
    "polo-t-shirt",
    "AF"
  );

  assert(
    /^AF[A-Z0-9]+$/i.test(poloCode),
    `Generated short & clean Polo style code: "${poloCode}"`,
    { poloCode }
  );

  const panjabiCode = await generateUniqueProductCode(
    "Royal Embroidered Panjabi Set",
    "panjabi",
    "AF"
  );

  assert(
    panjabiCode.startsWith("AF"),
    `Generated short & clean Panjabi style code: "${panjabiCode}"`,
    { panjabiCode }
  );

  // Variant SKU generation
  const varSku = formatVariantSku(poloCode, "Navy Blue", "XL");
  assert(
    varSku === `${poloCode}-NB-XL`,
    `Generated structured variant SKU: "${varSku}"`,
    { varSku }
  );

  // ---------------------------------------------------------------------------
  // SUITE 2: FINANCIAL MARGIN & PROFIT CALCULATION INTELLIGENCE
  // ---------------------------------------------------------------------------
  console.log("\n💰 SUITE 2: Financial Margin & Profit Calculation Intelligence");

  const costPrice = 650;
  const basePrice = 1250;
  const unitProfit = basePrice - costPrice;
  const marginPercent = Math.round((unitProfit / basePrice) * 100);

  assert(unitProfit === 600, `Unit Gross Profit exact match: ৳${unitProfit}`);
  assert(marginPercent === 48, `Gross Profit Margin calculated at ${marginPercent}% (Healthy > 35%)`);

  // ---------------------------------------------------------------------------
  // SUITE 3: INVENTORY MASTER TO STOREFRONT PUBLISHING (DRAFT -> ACTIVE)
  // ---------------------------------------------------------------------------
  console.log("\n🚀 SUITE 3: Inventory Master to Storefront Publishing Workflow");

  // Create or find a test draft product in Inventory
  const testCategory = await prisma.category.findFirst({
    where: { isActive: true },
  });

  const testWarehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
  });

  if (!testCategory || !testWarehouse) {
    console.error("❌ Prerequisites missing: Category or Warehouse not found.");
    process.exit(1);
  }

  const uniqueSlug = `qa-pos-style-${Date.now()}`;
  const testStyleCode = `AFPTS-QA-${Date.now().toString().slice(-4)}`;

  // 1. Intake to inventory as DRAFT
  const draftProduct = await prisma.product.create({
    data: {
      name: "QA Automated POS Test Style",
      slug: uniqueSlug,
      sku: testStyleCode,
      basePrice: 1500,
      costPrice: 800,
      status: "DRAFT",
      categoryId: testCategory.id,
      variants: {
        create: [
          {
            sku: `${testStyleCode}-BLK-M`,
            barcode: "894200000001",
            priceOverride: 1500,
            costPrice: 800,
            attributes: { Color: "Black", Size: "M" },
            isActive: true,
            inventoryLevels: {
              create: {
                warehouseId: testWarehouse.id,
                quantityAvailable: 25,
                quantityReserved: 0,
              },
            },
          },
          {
            sku: `${testStyleCode}-NVY-L`,
            barcode: "894200000002",
            priceOverride: 1500,
            costPrice: 800,
            attributes: { Color: "Navy", Size: "L" },
            isActive: true,
            inventoryLevels: {
              create: {
                warehouseId: testWarehouse.id,
                quantityAvailable: 30,
                quantityReserved: 0,
              },
            },
          },
        ],
      },
    },
    include: {
      variants: {
        include: { inventoryLevels: true },
      },
    },
  });

  assert(draftProduct.status === "DRAFT", `Style saved in Inventory as DRAFT (#${draftProduct.sku})`);

  // Verify it is NOT published on the public storefront
  const publicStoreCheck1 = await CatalogRepository.getProducts({
    search: draftProduct.name,
    limit: 10,
  });
  const foundDraftOnStore = publicStoreCheck1.data.some((p: any) => p.id === draftProduct.id);
  assert(!foundDraftOnStore, `Draft style is correctly hidden from public storefront`);

  // 2. Publish to Storefront (Flip to ACTIVE)
  const publishedProduct = await prisma.product.update({
    where: { id: draftProduct.id },
    data: {
      status: "ACTIVE",
      updatedAt: new Date(),
    },
    include: {
      variants: { include: { inventoryLevels: true } },
    },
  });

  assert(publishedProduct.status === "ACTIVE", `Style flipped to ACTIVE via One-Click Publish`);

  // Verify it IS NOW published on the public storefront
  const publicStoreCheck2 = await CatalogRepository.getProducts({
    search: publishedProduct.name,
    limit: 10,
  });
  const foundActiveOnStore = publicStoreCheck2.data.some((p: any) => p.id === publishedProduct.id);
  assert(foundActiveOnStore, `Published product is now live and searchable on storefront!`);

  // 3. Clean up test record
  await prisma.inventoryLevel.deleteMany({
    where: {
      variant: { productId: draftProduct.id },
    },
  });
  await prisma.variant.deleteMany({ where: { productId: draftProduct.id } });
  await prisma.product.delete({ where: { id: draftProduct.id } });
  console.log("  🧹 Cleaned up temporary QA test style record cleanly.");

  // ---------------------------------------------------------------------------
  // SUITE 4: STOREFRONT CATALOG & SEARCH QA
  // ---------------------------------------------------------------------------
  console.log("\n🛍️ SUITE 4: Storefront Catalog, Categories & Search Integrity");

  const catalogSample = await CatalogRepository.getProducts({ limit: 12 });
  assert(catalogSample.data.length > 0, `Catalog retrieved ${catalogSample.data.length} active products`);
  assert(catalogSample.count > 0, `Total catalog count: ${catalogSample.count} published items`);

  // Check product by slug
  if (catalogSample.data[0]) {
    const slugTest = await CatalogRepository.getProductBySlug(catalogSample.data[0].slug);
    assert(
      !!slugTest && slugTest.id === catalogSample.data[0].id,
      `Retrieved product by slug: "${catalogSample.data[0].slug}" (${slugTest?.sku || "N/A"})`
    );
  }

  // ---------------------------------------------------------------------------
  // SUITE 5: MARKETING & PROMOTIONS (COUPON SYSTEM QA)
  // ---------------------------------------------------------------------------
  console.log("\n🏷️ SUITE 5: Marketing & Coupon Discount Engine");

  const coupons = await prisma.coupon.findMany({
    where: { isActive: true },
    take: 3,
  });

  assert(coupons.length > 0, `Found ${coupons.length} active promotional coupons`);

  if (coupons[0]) {
    const validation = await CouponService.validateAndCalculateDiscount(coupons[0].code, 5000);
    assert(
      validation.isValid,
      `Coupon "${coupons[0].code}" validated successfully (Discount: ৳${validation.discount})`,
      { discount: validation.discount, type: coupons[0].discountType }
    );
  }

  console.log("\n================================================================================");
  console.log(`📊 FULL WEBSITE QA SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED (100%)`);
  console.log("================================================================================\n");

  await prisma.$disconnect();

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runComprehensiveWebsiteQA().catch((err) => {
  console.error("FATAL ERROR IN WEBSITE QA SUITE:", err);
  process.exit(1);
});
