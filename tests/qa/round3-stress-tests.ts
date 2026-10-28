import { prisma } from "@/lib/prisma";
import {
  createInventoryMasterIntakeAction,
  dispatchToBranchAction,
  getInventoryFinancialReportAction,
} from "@/lib/actions/admin/inventory-master.actions";
import { generateEAN13Sync } from "@/lib/utils/barcode";

async function runRound3StressAndEdgeCases() {
  console.log("===============================================================");
  console.log("🚀 QA ROUND 3: HIGH-SCALE STRESS & EDGE-CASE VALIDATION");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${detail || "Assertion failed"}`);
      failed++;
    }
  }

  const createdProductIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // Test 1: High-Volume 1,000 Units Bulk Intake & Auto-Split Exact Sum
    // -------------------------------------------------------------
    console.log("--- TEST 1: 1,000 Units Bulk Intake & Exact Matrix Sum ---");
    const colors = ["Midnight Black", "Deep Navy", "Steel Grey", "Crimson Red"];
    const sizes = ["S", "M", "L", "XL", "XXL"]; // 4 * 5 = 20 cells
    const targetTotalQty = 1000;

    // Simulate auto-split algorithm on 20 cells
    const cellCount = colors.length * sizes.length;
    const baseQty = Math.floor(targetTotalQty / cellCount); // 50
    const remainder = targetTotalQty % cellCount; // 0

    let idx = 0;
    const colorVariants = colors.map((c) => {
      return {
        color: c,
        sizes: sizes.map((s) => {
          const q = baseQty + (idx < remainder ? 1 : 0);
          idx++;
          return { size: s, quantity: q };
        }),
      };
    });

    const sumQty = colorVariants.reduce(
      (sum, cv) => sum + cv.sizes.reduce((sSum, sz) => sSum + sz.quantity, 0),
      0
    );
    assert(sumQty === 1000, "Matrix auto-split produces exact sum of 1,000 units", `Got ${sumQty}`);

    // Fetch active warehouse and category
    const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
    if (!warehouse) throw new Error("No active warehouse found in database.");
    assert(warehouse !== null, "Active central warehouse exists");

    let category = await prisma.category.findFirst({ where: { isActive: true } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: "QA Stress Category", slug: `qa-stress-${Date.now()}`, isActive: true },
      });
    }

    const intake1000Result = await createInventoryMasterIntakeAction({
      name: `QA Stress 1000-Unit Oxford Shirt ${Date.now().toString().slice(-4)}`,
      categoryId: category.id,
      basePrice: 4500,
      costPrice: 2100,
      totalQuantity: 1000,
      colorVariants,
      publishImmediately: false,
    });

    assert(intake1000Result.success === true, "1,000 units bulk master intake created successfully");
    const createdProduct = intake1000Result.data?.product;
    if (createdProduct?.id) {
      const prodId = createdProduct.id;
      createdProductIds.push(prodId);

      // Verify product and inventory rows in DB
      const dbProduct = await prisma.product.findUnique({
        where: { id: prodId },
        include: {
          variants: {
            include: { inventoryLevels: true },
          },
        },
      });

      assert(dbProduct !== null, "Product found in database");
      assert(dbProduct?.variants.length === 20, `Generated exactly 20 variants (4 colors x 5 sizes). Got: ${dbProduct?.variants.length}`);

      const totalDbStock = dbProduct?.variants.reduce(
        (sum, v) => sum + (v.inventoryLevels[0]?.quantityAvailable || 0),
        0
      );
      assert(totalDbStock === 1000, `Database stock sum across all variants is exactly 1,000 (Got: ${totalDbStock})`);

      // -------------------------------------------------------------
      // Test 2: Barcode Uniqueness Across 20 Variants (No Collisions)
      // -------------------------------------------------------------
      console.log("\n--- TEST 2: High-Volume Barcode Uniqueness & Format ---");
      const barcodes = dbProduct?.variants.map((v) => v.barcode).filter(Boolean) as string[];
      const uniqueBarcodes = new Set(barcodes);
      assert(
        barcodes.length === 20 && uniqueBarcodes.size === 20,
        "All 20 variants generated 100% unique barcodes without collision"
      );

      const allValidEan13 = barcodes.every(
        (b) => b.length === 13 && b.startsWith("894") && /^\d+$/.test(b)
      );
      assert(allValidEan13, "All 20 barcodes conform to valid 13-digit Bangladeshi GS1 prefix (894...)");

      // Fetch active retail branch
      const targetBranch = await prisma.branches.findFirst({ where: { is_active: true } });
      assert(targetBranch !== null, "Active retail branch exists");

      // -------------------------------------------------------------
      // Test 3: Negative Stock Safeguard (Over-dispatch Prevention)
      // -------------------------------------------------------------
      console.log("\n--- TEST 3: Negative Stock / Over-dispatch Guard ---");
      const sampleVariant = dbProduct!.variants[0];
      const initialStock = sampleVariant.inventoryLevels[0]?.quantityAvailable || 50;

      // Attempt to dispatch initialStock + 50 units (should fail)
      const overTransferResult = await dispatchToBranchAction({
        sourceWarehouseId: warehouse.id,
        destinationBranchId: targetBranch!.id,
        variantId: sampleVariant.id,
        quantity: initialStock + 50,
        notes: "QA Over-dispatch negative test",
      });

      assert(
        overTransferResult.success === false,
        "Over-dispatch rejected when requested qty exceeds available stock",
        overTransferResult.error
      );

      // Verify stock was NOT altered
      const variantAfterFail = await prisma.variant.findUnique({
        where: { id: sampleVariant.id },
        include: { inventoryLevels: true },
      });
      assert(
        variantAfterFail?.inventoryLevels[0]?.quantityAvailable === initialStock,
        `Inventory preserved intact after failed transfer (${variantAfterFail?.inventoryLevels[0]?.quantityAvailable} === ${initialStock})`
      );

      // -------------------------------------------------------------
      // Test 4: Zero / Negative Quantity Transfer Guard
      // -------------------------------------------------------------
      console.log("\n--- TEST 4: Zero / Negative Input Validation ---");
      const zeroTransferResult = await dispatchToBranchAction({
        sourceWarehouseId: warehouse.id,
        destinationBranchId: targetBranch!.id,
        variantId: sampleVariant.id,
        quantity: 0,
      });
      assert(
        zeroTransferResult.success === false,
        "Transfer with 0 quantity correctly rejected"
      );

      const negTransferResult = await dispatchToBranchAction({
        sourceWarehouseId: warehouse.id,
        destinationBranchId: targetBranch!.id,
        variantId: sampleVariant.id,
        quantity: -10,
      });
      assert(
        negTransferResult.success === false,
        "Transfer with negative quantity correctly rejected"
      );

      // -------------------------------------------------------------
      // Test 5: Valid Dispatch & Atomic DB Balance Deduction
      // -------------------------------------------------------------
      console.log("\n--- TEST 5: Atomic Stock Deduction on Valid Transfer ---");
      const transferQty = 25;
      const validTransferResult = await dispatchToBranchAction({
        sourceWarehouseId: warehouse.id,
        destinationBranchId: targetBranch!.id,
        variantId: sampleVariant.id,
        quantity: transferQty,
        notes: "QA valid dispatch 25 units",
      });

      assert(validTransferResult.success === true, `Successfully transferred ${transferQty} units to ${targetBranch?.name}`);

      const variantAfterTransfer = await prisma.variant.findUnique({
        where: { id: sampleVariant.id },
        include: { inventoryLevels: true },
      });
      assert(
        variantAfterTransfer?.inventoryLevels[0]?.quantityAvailable === initialStock - transferQty,
        `Stock accurately decremented from ${initialStock} to ${initialStock - transferQty}`
      );

      // Verify branch transfer record
      const transferRecord = await prisma.branchTransfer.findFirst({
        where: {
          variantId: sampleVariant.id,
          destinationBranchId: targetBranch!.id,
        },
        orderBy: { createdAt: "desc" },
      });
      assert(transferRecord !== null && transferRecord.quantity === transferQty, "Branch transfer log created in database");

      // -------------------------------------------------------------
      // Test 6: Zero Cost Edge-Case (Margin Divide-by-Zero Check)
      // -------------------------------------------------------------
      console.log("\n--- TEST 6: Zero Cost Price Margin Safety ---");
      const zeroCostIntake = await createInventoryMasterIntakeAction({
        name: `QA Free Promotional Merch ${Date.now().toString().slice(-4)}`,
        categoryId: category.id,
        basePrice: 1000,
        costPrice: 0,
        totalQuantity: 10,
        colorVariants: [
          {
            color: "White",
            sizes: [{ size: "Free", quantity: 10 }],
          },
        ],
      });

      assert(zeroCostIntake.success === true, "Intake with 0 cost price handled gracefully");
      if (zeroCostIntake.data?.product?.id) {
        createdProductIds.push(zeroCostIntake.data.product.id);
      }

      // Check valuation financial report
      const valuation = await getInventoryFinancialReportAction();
      assert(valuation.success === true, "Inventory financial report computed without runtime error");
      const summary = valuation.data?.summary;
      assert(
        typeof summary?.overallGrossMargin === "number" && !isNaN(summary.overallGrossMargin),
        `Weighted margin is a valid number: ${summary?.overallGrossMargin}%`
      );
      assert(
        (summary?.totalInStockUnits || 0) >= 975,
        `Total warehouse units tracked accurately (Got: ${summary?.totalInStockUnits})`
      );

      // -------------------------------------------------------------
      // Test 7: EAN-13 Checksum Algorithm Unit Verifier
      // -------------------------------------------------------------
      console.log("\n--- TEST 7: EAN-13 Barcode Algorithm Correctness ---");
      const generatedCode = generateEAN13Sync();
      assert(generatedCode.length === 13, `Generated barcode length is 13 (Got: ${generatedCode})`);
      assert(generatedCode.startsWith("894"), `Generated barcode starts with 894 GS1 Bangladesh`);

      // Verify checksum formula:
      // sum(odd_pos) + 3*sum(even_pos) + checksum % 10 === 0
      const digits = generatedCode.split("").map(Number);
      const dataDigits = digits.slice(0, 12);
      const checkDigit = digits[12];
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += (i % 2 === 0 ? 1 : 3) * dataDigits[i];
      }
      const calculatedCheck = (10 - (sum % 10)) % 10;
      assert(checkDigit === calculatedCheck, `Check digit verified: ${checkDigit} matches calculated ${calculatedCheck}`);
    }
  } catch (err: any) {
    console.error("💥 UNEXPECTED EXCEPTION IN QA ROUND 3:", err);
    failed++;
  } finally {
    // Cleanup created test products and their transfers
    console.log("\n--- CLEANUP: Removing Stress Test Artefacts ---");
    if (createdProductIds.length > 0) {
      await prisma.branchTransfer.deleteMany({
        where: {
          variant: {
            productId: { in: createdProductIds },
          },
        },
      });

      await prisma.stockMovement.deleteMany({
        where: {
          variant: {
            productId: { in: createdProductIds },
          },
        },
      });

      await prisma.inventoryLevel.deleteMany({
        where: {
          variant: {
            productId: { in: createdProductIds },
          },
        },
      });

      await prisma.variant.deleteMany({
        where: {
          productId: { in: createdProductIds },
        },
      });

      await prisma.productCategory.deleteMany({
        where: {
          productId: { in: createdProductIds },
        },
      });

      await prisma.product.deleteMany({
        where: {
          id: { in: createdProductIds },
        },
      });
      console.log(`  🧹 Cleaned up ${createdProductIds.length} test products and associated records.`);
    }
    await prisma.$disconnect();
  }

  console.log("\n===============================================================");
  console.log(`🏁 QA ROUND 3 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRound3StressAndEdgeCases();
