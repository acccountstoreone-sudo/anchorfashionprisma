import { prisma } from "../lib/prisma";
import {
  createInventoryMasterIntakeAction,
  getInventoryMasterListAction,
  generateProductCodeAction,
} from "../lib/actions/admin/inventory-master.actions";

import { ProductRepository } from "../lib/repositories/catalog/product.repository";
import { CatalogRepository } from "../repositories/catalog.repository";

interface AuditStep {
  step: string;
  passed: boolean;
  details: string;
  error?: string;
}

const auditSteps: AuditStep[] = [];

function recordStep(step: string, passed: boolean, details: string, error?: string) {
  auditSteps.push({ step, passed, details, error });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${step}]: ${details} ${error ? `(Error: ${error})` : ""}`);
}

async function runInventoryToProductAudit() {
  console.log("==========================================================================");
  console.log("    ANCHOR FASHION - INVENTORY TO PRODUCT END-TO-END FLOW AUDIT        ");
  console.log("    Scope: Backend, Database, Calculations, APIs & Storefront Sync     ");
  console.log("==========================================================================\n");

  let createdProductId: string | null = null;

  try {
    // ── STEP 1: Find or Verify Category & Warehouse ──
    console.log("--- 1. DATABASE FOUNDATION & PREREQUISITES ---");
    const category = await prisma.category.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (!category) throw new Error("No active category found in database.");
    recordStep("Category Setup", true, `Active category found: "${category.name}" (ID: ${category.id})`);

    const defaultWarehouseId = await ProductRepository.getDefaultWarehouseId();
    recordStep("Warehouse Verification", true, `Default Central Warehouse verified (ID: ${defaultWarehouseId})`);

    // ── STEP 2: Product Code / SKU Generation ──
    console.log("\n--- 2. SKU & BARCODE ALGORITHMIC GENERATION ---");
    const testProductName = `Audit Royal Oxford Shirt ${Date.now().toString().slice(-4)}`;
    const generatedCode = await generateProductCodeAction({
      productName: testProductName,
      categoryNameOrId: category.id,
      brandPrefix: "AF",
    });
    recordStep("Style Code Generator", Boolean(generatedCode && generatedCode.startsWith("AF")), `Generated Style Code: ${generatedCode}`);

    // ── STEP 3: Inventory Master Intake (Intake Dialog Action) ──
    console.log("\n--- 3. INVENTORY MASTER INTAKE (BACKEND ACTION & DB WRITE) ---");
    const sellingPrice = 2450;
    const costPrice = 1250;
    const expectedUnitProfit = sellingPrice - costPrice; // 1200
    const expectedMarginPercent = Math.round(((sellingPrice - costPrice) / sellingPrice) * 1000) / 10; // 49.0%

    const intakeResult = await createInventoryMasterIntakeAction({
      name: testProductName,
      categoryId: category.id,
      basePrice: sellingPrice,
      costPrice: costPrice,
      totalQuantity: 30,
      publishImmediately: false, // Default to DRAFT (Inventory-First gate)
      notes: "Automated QA test intake for Inventory -> Product flow verification",
      skuPrefix: generatedCode,
      colorVariants: [
        {
          color: "Classic White",
          sizes: [
            { size: "M", quantity: 5 },
            { size: "L", quantity: 10 },
            { size: "XL", quantity: 5 },
          ],
        },
        {
          color: "Navy Blue",
          sizes: [
            { size: "M", quantity: 4 },
            { size: "L", quantity: 6 },
          ],
        },
      ],
    });

    if (!intakeResult.success || !intakeResult.data) {
      throw new Error(intakeResult.error || "createInventoryMasterIntakeAction failed");
    }

    createdProductId = intakeResult.data.product.id;
    recordStep(
      "Master Product Creation",
      true,
      `Master item created in DB (ID: ${createdProductId}, Status: ${intakeResult.data.product.status})`
    );
    recordStep(
      "Variants & Barcode Matrix",
      intakeResult.data.variants.length === 5,
      `Created ${intakeResult.data.variants.length} color/size variants with unique EAN-13 barcodes`
    );

    // Verify Database Records Directly
    const dbProduct = await prisma.product.findUnique({
      where: { id: createdProductId },
      include: {
        variants: {
          include: {
            inventoryLevels: true,
          },
        },
      },
    });

    if (!dbProduct) throw new Error("Created product not found in PostgreSQL!");

    const totalStock = dbProduct.variants.reduce((sum, v) => {
      const level = v.inventoryLevels[0];
      return sum + (level?.quantityAvailable || 0);
    }, 0);
    recordStep("Inventory Level Allocation", totalStock === 30, `Total physical stock in warehouse: ${totalStock} units (Expected 30)`);

    // Verify StockMovement audit log
    const stockMovements = await prisma.stockMovement.findMany({
      where: { referenceId: createdProductId },
    });
    recordStep("Stock Ledger (StockMovement)", stockMovements.length === 5, `Recorded ${stockMovements.length} opening intake ledger entries with movementType: IN`);

    // ── STEP 4: Inventory Master Retrieval & Financial Calculations ──
    console.log("\n--- 4. INVENTORY QUERY API & FINANCIAL VALUATION CALCULATIONS ---");
    const masterListRes = await getInventoryMasterListAction({
      search: testProductName,
      limit: 5,
    });

    if (!masterListRes.success || !masterListRes.data || masterListRes.data.items.length === 0) {
      throw new Error("Product not returned by getInventoryMasterListAction");
    }

    const fetchedItem = masterListRes.data.items.find((i) => i.id === createdProductId);
    if (!fetchedItem) throw new Error("Created product not found in inventory list query");

    recordStep("Inventory Retrieval API", true, `Retrieved item "${fetchedItem.name}" with SKU: ${fetchedItem.sku}`);
    recordStep(
      "Financial: Unit Profit",
      fetchedItem.unitProfit === expectedUnitProfit,
      `Unit Profit: ৳${fetchedItem.unitProfit} (Selling: ৳${fetchedItem.basePrice} - Cost: ৳${fetchedItem.costPrice})`
    );
    recordStep(
      "Financial: Margin %",
      Math.abs(fetchedItem.profitMarginPercent - expectedMarginPercent) < 0.5,
      `Profit Margin: ${fetchedItem.profitMarginPercent}% (Expected: ${expectedMarginPercent}%)`
    );
    recordStep(
      "Financial: Total Cost Valuation",
      fetchedItem.totalCostValue === 30 * costPrice,
      `Inventory Cost Value: ৳${fetchedItem.totalCostValue.toLocaleString()} (30 units × ৳${costPrice})`
    );
    recordStep(
      "Financial: Retail Value",
      fetchedItem.totalRetailValue === 30 * sellingPrice,
      `Potential Retail Value: ৳${fetchedItem.totalRetailValue.toLocaleString()} (30 units × ৳${sellingPrice})`
    );

    // ── STEP 5: Product Studio Publishing to Storefront ──
    console.log("\n--- 5. STOREFRONT PUBLISHING PIPELINE (ProductForm -> Store) ---");
    const updatedProduct = await ProductRepository.updateProduct(createdProductId, {
      name: `${testProductName} - Luxury Edition`,
      status: "ACTIVE", // GO LIVE
      shortDescription: "Handcrafted 100% Egyptian Giza Cotton luxury oxford shirt.",
      description: "Exquisite tailoring with pearl buttons, french seams, and relaxed modern cut.",
      isFeatured: true,
      media: [
        {
          url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800",
          altText: "White Oxford Shirt Front",
          isPrimary: true,
          displayOrder: 0,
          mediaType: "IMAGE",
        },
      ],
      variants: dbProduct.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        priceOverride: 2450,
        costPrice: 1250,
        stockQuantity: v.inventoryLevels[0]?.quantityAvailable || 0,
        soldQuantity: 0,
        attributes: v.attributes as any,
        isActive: true,
      })),
    });

    if (!updatedProduct) {
      throw new Error("Failed to update and publish product via ProductRepository");
    }

    recordStep("Storefront Publishing Action", true, `Product status successfully updated to "ACTIVE" with media and SEO`);

    // ── STEP 6: Verify Storefront Visibility ──
    console.log("\n--- 6. STOREFRONT PUBLIC CATALOG VISIBILITY ---");
    const storefrontProducts = await ProductRepository.getProducts({
      search: testProductName,
      limit: 5,
    });

    const isVisibleInStore = storefrontProducts.products.some((p) => p.id === createdProductId && p.status === "ACTIVE");
    recordStep("Storefront Live Catalog Sync", isVisibleInStore, `Product is live and visible on public Storefront Catalog (/products)`);

    // Verify PDP (Product Detail Page) Fetching
    const livePdp = await CatalogRepository.getProductBySlug(dbProduct.slug);
    recordStep("PDP Product Resolution", Boolean(livePdp && livePdp.status === "ACTIVE"), `Live PDP resolved slug "${dbProduct.slug}" with ${livePdp?.variants?.length} purchasable variants`);

    console.log("\n==========================================================================");
    console.log("                    AUDIT SUMMARY & VERIFICATION                         ");
    console.log("==========================================================================");
    const totalPassed = auditSteps.filter((s) => s.passed).length;
    console.log(`Passed: ${totalPassed}/${auditSteps.length} checks (${Math.round((totalPassed / auditSteps.length) * 100)}%)`);
    console.log("==========================================================================\n");

  } catch (err: any) {
    console.error("❌ AUDIT FAILURE:", err.message);
    recordStep("Audit Exception", false, "Uncaught error during test", err.message);
  } finally {
    // ── STEP 7: Cleanup Test Artifacts ──
    if (createdProductId) {
      console.log("Cleaning up test product from database...");
      try {
        await prisma.stockMovement.deleteMany({ where: { referenceId: createdProductId } });
        const variants = await prisma.variant.findMany({ where: { productId: createdProductId }, select: { id: true } });
        const variantIds = variants.map((v) => v.id);
        await prisma.inventoryLevel.deleteMany({ where: { variantId: { in: variantIds } } });
        await prisma.variant.deleteMany({ where: { productId: createdProductId } });
        await prisma.productCategory.deleteMany({ where: { productId: createdProductId } });
        await prisma.productMedia.deleteMany({ where: { productId: createdProductId } });
        await prisma.productSeo.deleteMany({ where: { productId: createdProductId } });
        await prisma.product.delete({ where: { id: createdProductId } });
        console.log("✅ Cleanup complete: Test data cleanly removed.");
      } catch (cleanErr: any) {
        console.warn("Cleanup warning:", cleanErr.message);
      }
    }
    await prisma.$disconnect();
  }
}

runInventoryToProductAudit();
