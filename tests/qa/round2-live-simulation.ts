import { prisma } from "@/lib/prisma";
import {
  createInventoryMasterIntakeAction,
  dispatchToBranchAction,
  toggleProductPublishStatusAction,
  getBranchTransfersReportAction,
  getInventoryFinancialReportAction,
} from "@/lib/actions/admin/inventory-master.actions";

async function runQA2() {
  console.log("=== [QA ROUND 2] Live End-to-End Simulation Starting ===");

  // 1. Fetch default warehouse and category
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  if (!warehouse) throw new Error("QA Failed: No active warehouse found in database.");

  const category = await prisma.category.findFirst({ where: { isActive: true } });
  if (!category) throw new Error("QA Failed: No active category found in database.");

  console.log(`[PASS] Environment ready: Warehouse=${warehouse.name}, Category=${category.name}`);

  // 2. Master Product Intake Test
  const testTitle = `QA2 Master Silk Shirt ${Date.now().toString().slice(-4)}`;
  const intakeInput = {
    name: testTitle,
    categoryId: category.id,
    basePrice: 5000,
    costPrice: 2300,
    totalQuantity: 100,
    colorVariants: [
      {
        color: "Black",
        sizes: [
          { size: "M", quantity: 25 },
          { size: "L", quantity: 25 },
        ],
      },
      {
        color: "Navy Blue",
        sizes: [
          { size: "XL", quantity: 25 },
          { size: "XXL", quantity: 25 },
        ],
      },
    ],
    publishImmediately: false, // Must be DRAFT
    notes: "QA Round 2 Automated Verification",
  };

  const intakeResult = await createInventoryMasterIntakeAction(intakeInput);
  if (!intakeResult.success || !intakeResult.data) {
    throw new Error(`QA Failed: Intake failed: ${intakeResult.error}`);
  }

  const createdProduct = intakeResult.data.product;
  const createdVariants = intakeResult.data.variants;

  if (createdProduct.status !== "DRAFT") {
    throw new Error(`QA Failed: Expected status DRAFT, got ${createdProduct.status}`);
  }
  if (createdVariants.length !== 4) {
    throw new Error(`QA Failed: Expected 4 variants, got ${createdVariants.length}`);
  }
  if (intakeResult.data.totalStockUnits !== 100) {
    throw new Error(`QA Failed: Expected 100 stock units, got ${intakeResult.data.totalStockUnits}`);
  }

  console.log(`[PASS] Step 1: Master Intake created "${createdProduct.name}" (DRAFT) with 4 variants & 100 units.`);

  // 3. Test Barcode Validation
  for (const v of createdVariants) {
    if (!v.barcode || v.barcode.length !== 13 || !/^\d{13}$/.test(v.barcode)) {
      throw new Error(`QA Failed: Invalid barcode generated for variant ${v.sku}: ${v.barcode}`);
    }
  }
  console.log(`[PASS] Step 2: All ${createdVariants.length} variants have valid 13-digit EAN barcodes.`);

  // 4. Test Branch Transfer
  const targetBranch = await prisma.branches.findFirst({ where: { is_active: true } });
  if (!targetBranch) throw new Error("QA Failed: No active retail branches found in database.");

  const testVariant = createdVariants[0];
  const dispatchQty = 10;

  const dispatchResult = await dispatchToBranchAction({
    sourceWarehouseId: warehouse.id,
    destinationBranchId: targetBranch.id,
    variantId: testVariant.id,
    quantity: dispatchQty,
    notes: `QA2 Automated Transfer to ${targetBranch.name}`,
  });

  if (!dispatchResult.success) {
    throw new Error(`QA Failed: Branch dispatch failed: ${dispatchResult.error}`);
  }

  // Verify stock in DB
  const levelAfter = await prisma.inventoryLevel.findFirst({
    where: { variantId: testVariant.id, warehouseId: warehouse.id },
  });

  if (!levelAfter || levelAfter.quantityAvailable !== 15) {
    throw new Error(`QA Failed: Expected remaining stock 15, got ${levelAfter?.quantityAvailable}`);
  }
  console.log(`[PASS] Step 3: Branch Transfer dispatched 10 units to ${targetBranch.name}. Warehouse stock: 25 -> 15 units.`);

  // 5. Test Stock Reservation & Return Simulation
  // Simulate Customer Order Reservation
  await prisma.inventoryLevel.update({
    where: { id: levelAfter.id },
    data: {
      quantityAvailable: levelAfter.quantityAvailable - 5,
      quantityReserved: levelAfter.quantityReserved + 5,
    },
  });

  const levelReserved = await prisma.inventoryLevel.findUnique({ where: { id: levelAfter.id } });
  if (levelReserved?.quantityAvailable !== 10 || levelReserved?.quantityReserved !== 5) {
    throw new Error(`QA Failed: Stock reservation mismatch. Available: ${levelReserved?.quantityAvailable}, Reserved: ${levelReserved?.quantityReserved}`);
  }
  console.log(`[PASS] Step 4a: Order Buy/Reservation simulation: Available=10, Reserved=5.`);

  // Simulate Order Return / Cancel (Restock)
  await prisma.inventoryLevel.update({
    where: { id: levelAfter.id },
    data: {
      quantityAvailable: levelReserved.quantityAvailable + 5,
      quantityReserved: levelReserved.quantityReserved - 5,
    },
  });

  const levelRestocked = await prisma.inventoryLevel.findUnique({ where: { id: levelAfter.id } });
  if (levelRestocked?.quantityAvailable !== 15 || levelRestocked?.quantityReserved !== 0) {
    throw new Error(`QA Failed: Restock failed. Available: ${levelRestocked?.quantityAvailable}, Reserved: ${levelRestocked?.quantityReserved}`);
  }
  console.log(`[PASS] Step 4b: Order Return/Restock simulation restored: Available=15, Reserved=0.`);

  // 6. Test Storefront Publishing Workflow
  const pubRes = await toggleProductPublishStatusAction(createdProduct.id);
  if (!pubRes.success || pubRes.status !== "ACTIVE") {
    throw new Error(`QA Failed: Failed to publish product: ${pubRes.error}`);
  }

  const prodActive = await prisma.product.findUnique({ where: { id: createdProduct.id } });
  if (prodActive?.status !== "ACTIVE") {
    throw new Error(`QA Failed: Product status in DB is not ACTIVE`);
  }
  console.log(`[PASS] Step 5: Product successfully published from Inventory to Storefront (Status: ACTIVE).`);

  // 7. Verify Branch Dispatch Report
  const branchReport = await getBranchTransfersReportAction({ branchId: targetBranch.id });
  if (!branchReport.success || !branchReport.data) {
    throw new Error("QA Failed: Could not fetch branch transfers report.");
  }
  const branchInfo = branchReport.data.branchSummaries.find((b: any) => b.branchId === targetBranch.id);
  if (!branchInfo || branchInfo.totalUnits < dispatchQty) {
    throw new Error(`QA Failed: Branch report missing dispatched units. Reported: ${branchInfo?.totalUnits}`);
  }
  console.log(`[PASS] Step 6: Branch Dispatch Report verified: ${branchInfo.branchName} received ${branchInfo.totalUnits} units (Value: ৳${branchInfo.totalRetailValue}).`);

  // 8. Verify Financial Valuation Intelligence
  const finReport = await getInventoryFinancialReportAction();
  if (!finReport.success || !finReport.data) {
    throw new Error("QA Failed: Could not fetch financial valuation report.");
  }
  const summary = finReport.data.summary;
  if (summary.totalInStockUnits <= 0 || summary.totalStockRetailValue <= 0 || summary.overallGrossMargin <= 0) {
    throw new Error("QA Failed: Financial valuation summary returned zero or invalid values.");
  }
  console.log(`[PASS] Step 7: Financial Valuation Report verified: ${summary.totalInStockUnits} units, ৳${summary.totalStockRetailValue.toLocaleString()} Retail Value, Gross Margin=${summary.overallGrossMargin}%.`);

  console.log("=== [QA ROUND 2] 100% COMPLETE & ALL 7 CRITICAL CRITERIA PASSED! ===");
}

runQA2()
  .catch((err) => {
    console.error("QA Round 2 Failure:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
