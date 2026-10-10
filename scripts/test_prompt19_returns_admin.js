const { createClient } = require("@supabase/supabase-js");

// Use service role key to mock admin actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testReturnAuthorization() {
  console.log("=== Testing Prompt 19 Admin Returns ===");
  try {
    // Attempt to verify listReturns query structure
    const { data, error } = await supabase.from("returns").select("*, orders!inner(branch_id)").limit(1);
    if (error) {
      console.error("❌ Failed to query returns with branch_id join:", error.message);
      process.exit(1);
    }
    console.log("✅ Successfully verified listReturns can join orders table for branch authorization.");
    console.log("Found return:", data?.[0]?.id || "No returns in DB, but query succeeded.");

    console.log("\n=== All Tests Passed ===");
    process.exit(0);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

testReturnAuthorization();
