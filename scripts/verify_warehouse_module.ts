import { createAdminClient } from "../lib/supabase/admin-client";
import { WarehouseRepository } from "../repositories/warehouse.repository";
import { InventoryRepository } from "../repositories/inventory.repository";
import dotenv from "dotenv";
dotenv.config();

async function runVerification() {
  console.log("=================================================");
  console.log("STARTING COMPLETE WAREHOUSE MODULE VERIFICATION");
  console.log("=================================================");

  const supabase = createAdminClient();
  const whRepo = new WarehouseRepository();
  const invRepo = new InventoryRepository();

  let testWarehouseId = "";
  let testDestWarehouseId = "";
  let testZoneId = "";
  let testBinId = "";
  let testVariantId = "";

  try {
    // 1. Find an active product variant to test with
    const { data: variants, error: vErr } = await supabase
      .from("variants")
      .select("id, sku")
      .limit(1);
    if (vErr || !variants || variants.length === 0) {
      throw new Error("No variants found in database to run stock test.");
    }
    testVariantId = variants[0].id;
    console.log("✔ Step 1: Active Variant Found:", testVariantId, variants[0].sku);

    // 2. Test Warehouse Creation with Full Enterprise Metadata
    const uniqueCode1 = `WH-T${Date.now().toString().slice(-5)}`;
    const createdWh = await whRepo.createWarehouse({
      name: "Chittagong Distribution Hub",
      code: uniqueCode1,
      operational_type: "DISTRIBUTION_CENTER",
      address: "Plot 55, Agrabad Commercial Area",
      city: "Chittagong",
      state: "Chittagong Division",
      country: "Bangladesh",
      postal_code: "4000",
      latitude: 22.3569,
      longitude: 91.7832,
      manager_name: "Kazi Rafiqul Islam",
      contact_person: "Mizanur Rahman",
      phone: "+880 1812-998877",
      email: "ctg.hub@anchorfashion.com",
      is_active: true,
      allow_negative_stock: false,
      enable_stock_tracking: true,
      enable_batch_tracking: true,
      notes: "Main deep-sea port logistics inbound hub",
    });
    testWarehouseId = createdWh.id;
    console.log("✔ Step 2: Warehouse Created with Metadata:", createdWh.id, createdWh.warehouse_code, createdWh.city, createdWh.manager_name);

    // Create a destination warehouse for transfer testing
    const uniqueCode2 = `WH-D${(Date.now() + 1).toString().slice(-5)}`;
    const destWh = await whRepo.createWarehouse({
      name: "Sylhet Regional Outlet",
      code: uniqueCode2,
      operational_type: "STORE",
      address: "Zindabazar Point",
      city: "Sylhet",
      is_active: true,
    });
    testDestWarehouseId = destWh.id;
    console.log("✔ Step 2b: Destination Warehouse Created:", destWh.id, destWh.warehouse_code);

    // 3. Test Warehouse Retrieval & Metadata Parsing
    const retrievedWh = await whRepo.getWarehouseById(testWarehouseId);
    if (!retrievedWh || retrievedWh.city !== "Chittagong" || retrievedWh.manager_name !== "Kazi Rafiqul Islam") {
      throw new Error(`Metadata parsing verification failed: ${JSON.stringify(retrievedWh)}`);
    }
    console.log("✔ Step 3: Warehouse Retrieved & Metadata Verified:", retrievedWh.name, retrievedWh.phone);

    // 4. Test Warehouse Update
    const updatedWh = await whRepo.updateWarehouse(testWarehouseId, {
      manager_name: "Kazi Rafiqul Islam (Promoted)",
      phone: "+880 1812-000111",
    });
    if (updatedWh.manager_name !== "Kazi Rafiqul Islam (Promoted)") {
      throw new Error("Update warehouse manager failed.");
    }
    console.log("✔ Step 4: Warehouse Updated:", updatedWh.manager_name, updatedWh.phone);

    // 5. Test Zone Creation
    const createdZone = await whRepo.createZone({
      warehouse_id: testWarehouseId,
      name: "Zone A - Fast Moving Goods",
      type: "PICKING",
      description: "Apparel fast-moving picking line",
    });
    testZoneId = createdZone.id;
    console.log("✔ Step 5: Zone Created:", createdZone.id, createdZone.name, createdZone.type);

    // 6. Test Rack Creation (Automated 4 Shelves)
    const createdRack = await whRepo.createRack(testZoneId, {
      name: "Rack A-01",
      code: "RACK-A01",
      shelves_count: 4,
      capacity: 200,
      description: "Steel heavy-duty racking unit",
    });
    console.log("✔ Step 6: Rack Created:", createdRack.code, `${createdRack.shelves_count} Shelves Generated`);

    // Verify shelves were created
    const zoneBins = await whRepo.getBinsByZone(testZoneId);
    if (zoneBins.length < 4) {
      throw new Error(`Expected at least 4 shelves/bins in zone, found ${zoneBins.length}`);
    }
    testBinId = zoneBins[0].id;
    console.log("✔ Step 6b: Shelves Verified in Zone:", zoneBins.map((b) => b.code).join(", "));

    // 7. Test Stock In Workflow
    const stockInResult = await invRepo.stockIn({
      variant_id: testVariantId,
      warehouse_id: testWarehouseId,
      bin_id: testBinId,
      quantity: 50,
      unit_cost: 350.0,
      purchase_order_id: "PO-VERIFY-001",
      batch_number: "BATCH-TEST-99",
      notes: "Initial receipt verification batch",
    });
    console.log("✔ Step 7: Stock In Successful. Available Stock:", stockInResult.quantity_available);

    // 8. Test Stock Out Workflow (Valid)
    const stockOutResult = await invRepo.stockOut({
      variant_id: testVariantId,
      warehouse_id: testWarehouseId,
      bin_id: testBinId,
      quantity: 10,
      reason: "CUSTOMER_ORDER",
      notes: "Dispatch test",
    });
    console.log("✔ Step 8: Stock Out Successful. Remaining Available:", stockOutResult.quantity_available);
    if (stockOutResult.quantity_available !== 40) {
      throw new Error(`Expected 40 units remaining, got ${stockOutResult.quantity_available}`);
    }

    // 8b. Test Negative Stock Prevention (attempting to remove 100 when only 40 exist)
    let negativeBlocked = false;
    try {
      await invRepo.stockOut({
        variant_id: testVariantId,
        warehouse_id: testWarehouseId,
        bin_id: testBinId,
        quantity: 100,
        reason: "CUSTOMER_ORDER",
      });
    } catch (e: any) {
      negativeBlocked = true;
      console.log("✔ Step 8b: Negative Stock Correctly Prevented:", e.message);
    }
    if (!negativeBlocked) {
      throw new Error("Negative stock should have been blocked!");
    }

    // 9. Test Stock Adjustment (Physical count reconciliation)
    const adjustResult = await invRepo.stockAdjustment({
      variant_id: testVariantId,
      warehouse_id: testWarehouseId,
      bin_id: testBinId,
      physical_count: 38,
      reason: "PHYSICAL_COUNT",
      notes: "2 units damaged in bin during transport",
    });
    console.log("✔ Step 9: Stock Adjustment Successful. New Qty:", adjustResult.updated.quantity_available, "Variance:", adjustResult.variance);
    if (adjustResult.variance !== -2) {
      throw new Error(`Expected variance -2, got ${adjustResult.variance}`);
    }

    // 10. Test Warehouse Transfer (from Chittagong WH to Sylhet WH)
    await invRepo.transferStock(
      testVariantId,
      testWarehouseId,
      testDestWarehouseId,
      8,
      "STORE_REPLENISHMENT",
      "Inter-facility stock transfer verification"
    );
    console.log("✔ Step 10: Inter-Warehouse Transfer Completed: 8 units moved from Chittagong to Sylhet.");

    // Verify movements audit trail
    const movements = await invRepo.getDetailedMovements({
      warehouseId: testWarehouseId,
      limit: 10,
    });
    console.log(`✔ Step 11: Stock Movements Audit Trail Verified: ${movements.data.length} movement records found.`);
    movements.data.slice(0, 4).forEach((m) => {
      console.log(`   - [${m.movement_type}] Qty: ${m.quantity} | Ref: ${m.reference_id} | Notes: ${m.notes}`);
    });

    // 12. Test Warehouse Inventory Query
    const inventory = await whRepo.getWarehouseInventory(testWarehouseId);
    console.log(`✔ Step 12: Warehouse Inventory Query Successful: ${inventory.total} records.`);
    if (inventory.data.length > 0) {
      console.log("   - Product:", inventory.data[0].product_name, "SKU:", inventory.data[0].sku, "Available:", inventory.data[0].quantity_available, "Shelf:", inventory.data[0].shelf_code);
    }

    console.log("\n=================================================");
    console.log("ALL TESTS PASSED SUCCESSFULLY! CLEANING UP TEST DATA...");
    console.log("=================================================");
  } finally {
    // Cleanup test data
    if (testWarehouseId || testDestWarehouseId) {
      const whIds = [testWarehouseId, testDestWarehouseId].filter(Boolean);
      await supabase.from("stock_movements").delete().in("warehouse_id", whIds);
      await supabase.from("inventory_levels").delete().in("warehouse_id", whIds);
      if (testZoneId) {
        await supabase.from("warehouse_bins").delete().eq("zone_id", testZoneId);
        await supabase.from("warehouse_zones").delete().eq("id", testZoneId);
      }
      await supabase.from("warehouses").delete().in("id", whIds);
      console.log("✔ Cleanup complete: Test warehouses, zones, bins, inventory, and movements removed.");
    }
  }
}

runVerification().catch((e) => {
  console.error("❌ VERIFICATION FAILED:", e);
  process.exit(1);
});
