/**
 * Test script for Prompt 18: Manager POS & Manual Order Placement
 * Run with: node scripts/test_prompt18_manager_pos.js
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("Please set SUPABASE_SERVICE_ROLE_KEY to run this test.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log("Starting Prompt 18 Manager POS Tests...\n");
  let passed = 0;
  let failed = 0;

  try {
    // 1. Verify schema additions (branch_id and order_source)
    const { data: cols, error: colsError } = await supabase
      .from("orders")
      .select("branch_id, order_source")
      .limit(1);

    if (colsError) {
      console.error("❌ Test 1 Failed: Schema modifications not found in 'orders'.", colsError.message);
      failed++;
    } else {
      console.log("✅ Test 1 Passed: 'branch_id' and 'order_source' exist on orders.");
      passed++;
    }

    // 2. Verify server-side services exist
    // This is implicit since if the script was loaded or if the API endpoint works, but we will test DB state.
    // Let's create a test POS order directly mimicking the service insert to ensure constraints work.
    
    // First, find a valid branch
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (!branch) {
      console.log("⚠️ Skipping Order tests: No branch found. Please seed branches.");
    } else {
      // Create a test order manually mimicking pos.service.ts
      const orderNumber = "POS-TEST-" + Date.now();
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          branch_id: branch.id,
          order_source: "MANAGER_POS",
          status: "confirmed",
          subtotal: 1000,
          grand_total: 1000,
          tax_total: 0,
          shipping_total: 0,
          currency: "BDT",
          payment_method: "CASH",
          payment_status: "PAID"
        })
        .select()
        .single();

      if (orderError) {
        console.error("❌ Test 2 Failed: Could not insert POS order with new fields.", orderError.message);
        failed++;
      } else {
        console.log("✅ Test 2 Passed: POS Order inserted successfully with new fields.");
        passed++;
        
        // Clean up
        await supabase.from("orders").delete().eq("id", order.id);
      }
    }

  } catch (err) {
    console.error("Unexpected error:", err);
    failed++;
  }

  console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
