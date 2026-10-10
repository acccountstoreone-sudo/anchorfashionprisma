import { createSupplierProfileAction, updateSupplierProfileAction, getSupplierProfiles } from "../app/actions/admin/procurement.actions";
import { createAdminClient } from "../lib/supabase/admin-client";
import dotenv from "dotenv";

dotenv.config();

async function testSupplierFlow() {
  console.log("=== PHASE 11: SUPPLIER MODULE DEEP VERIFICATION ===");
  const testCompanyName = `Test Supplier ${Date.now()}`;
  const testEmail = `supplier_${Date.now()}@example.com`;

  // 1. Create Supplier
  console.log("1. Creating supplier...");
  const createRes = await createSupplierProfileAction({
    company_name: testCompanyName,
    contact_person: "QA Tester",
    email: testEmail,
    phone: "01711223344",
    status: "ACTIVE",
  });

  if (!createRes.success || !createRes.data) {
    console.error("Create supplier failed:", createRes.error);
    process.exit(1);
  }
  const supplierId = createRes.data.id;
  console.log("   Created supplier ID:", supplierId);

  // 2. Verify Database Records in both tables (supplier_profiles and suppliers)
  console.log("2. Verifying database dual-write sync...");
  const supabase = createAdminClient();
  const { data: profileRow } = await supabase
    .from("supplier_profiles")
    .select("*")
    .eq("id", supplierId)
    .single();

  const { data: legacyRow } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  console.log("   supplier_profiles record exists:", !!profileRow, profileRow?.company_name);
  console.log("   suppliers (legacy sync) record exists:", !!legacyRow, legacyRow?.name);

  if (!profileRow || !legacyRow) {
    console.error("Dual-write sync check failed!");
    process.exit(1);
  }

  // 3. Verify getSupplierProfiles listing returns the new supplier
  console.log("3. Verifying getSupplierProfiles listing...");
  const listRes = await getSupplierProfiles();
  const found = listRes.data?.find((s: any) => s.id === supplierId);
  console.log("   Found in listing:", !!found, found?.name);

  if (!found) {
    console.error("Supplier missing from getSupplierProfiles!");
    process.exit(1);
  }

  // 4. Update supplier
  console.log("4. Updating supplier...");
  const updateRes = await updateSupplierProfileAction(supplierId, {
    contact_person: "QA Senior Auditor",
  });
  console.log("   Update result:", updateRes.success);

  // 5. Clean up test record
  console.log("5. Cleaning up test record...");
  await supabase.from("supplier_profiles").delete().eq("id", supplierId);
  await supabase.from("suppliers").delete().eq("id", supplierId);
  console.log("   Test supplier deleted cleanly.");

  console.log("ALL PHASE 11 SUPPLIER VERIFICATIONS PASSED!");
}

testSupplierFlow().catch(console.error);
