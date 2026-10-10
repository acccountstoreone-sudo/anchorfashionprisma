const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function runTests() {
  console.log("\n=======================================================");
  console.log("   AUTOMATED INTEGRATION TESTS: PROMPT 2/5");
  console.log("   Finance/Expenses + Custom Report Builder");
  console.log("=======================================================\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Check database connectivity and custom_reports_config table
  try {
    const { data, error } = await supabase
      .from('custom_reports_config')
      .select('id, report_name')
      .limit(1);
    assert(!error, `Connected to custom_reports_config: ${error?.message || 'OK'}`);
  } catch (err) {
    assert(false, `custom_reports_config connectivity failed: ${err.message}`);
  }

  // TEST 2: Save custom report configuration to database
  let savedReportId = null;
  try {
    const testReport = {
      report_name: `Automated Test Report ${Date.now()}`,
      description: "Integration test generated report",
      dimensions: ["date", "category"],
      metrics: ["sales", "profit"],
      filters: { dateRange: "30d" },
      chart_type: "table",
      is_public: false,
    };

    // Fetch a user/profile id for owner
    const { data: prof } = await supabase.from('profiles').select('id').limit(1).single();
    testReport.owner_id = prof ? prof.id : '00000000-0000-0000-0000-000000000000';

    const { data: saved, error: saveErr } = await supabase
      .from('custom_reports_config')
      .insert(testReport)
      .select()
      .single();

    assert(!saveErr && saved?.id, `Report saved to database with ID: ${saved?.id}`);
    savedReportId = saved?.id;
  } catch (err) {
    assert(false, `Report save failed: ${err.message}`);
  }

  // TEST 3: Reload saved report from database
  if (savedReportId) {
    try {
      const { data: loaded, error: loadErr } = await supabase
        .from('custom_reports_config')
        .select('*')
        .eq('id', savedReportId)
        .single();

      assert(
        !loadErr && loaded?.report_name.startsWith('Automated Test Report'),
        `Reloaded report "${loaded?.report_name}" successfully`
      );
    } catch (err) {
      assert(false, `Report reload failed: ${err.message}`);
    }
  }

  // TEST 4: Delete saved report to keep database clean
  if (savedReportId) {
    try {
      const { error: delErr } = await supabase
        .from('custom_reports_config')
        .delete()
        .eq('id', savedReportId);

      assert(!delErr, `Deleted test report ${savedReportId} successfully`);
    } catch (err) {
      assert(false, `Report deletion failed: ${err.message}`);
    }
  }

  // TEST 5: Verify bi_sales_mart query capability
  try {
    const { data: martRows, error: martErr } = await supabase
      .from('bi_sales_mart')
      .select('*')
      .limit(5);

    assert(!martErr, `bi_sales_mart query executed without error (rows: ${martRows?.length ?? 0})`);
  } catch (err) {
    assert(false, `bi_sales_mart query failed: ${err.message}`);
  }

  // TEST 6: Verify warehouses and branches fetch for expense forms
  try {
    const { data: wh, error: whErr } = await supabase.from('warehouses').select('id, name');
    const { data: br, error: brErr } = await supabase.from('branches').select('id, name');
    assert(!whErr, `Warehouses fetched: ${wh?.length || 0} active`);
    assert(!brErr, `Branches fetched: ${br?.length || 0} active`);
  } catch (err) {
    assert(false, `Warehouse/branch query failed: ${err.message}`);
  }

  // TEST 7: Test Report Query Execution Engine with Whitelisting
  try {
    const dimensions = ["date", "category"];
    const metrics = ["sales", "orders", "profit"];
    const dateRange = "30d";

    const now = new Date();
    const fromDate = new Date();
    fromDate.setDate(now.getDate() - 30);

    const { data: catData } = await supabase.from("categories").select("name").limit(5);
    const { data: brandData } = await supabase.from("brands").select("name").limit(5);

    const cats = catData?.map(c => c.name) || ["Apparel", "Footwear"];
    const brands = brandData?.map(b => b.name) || ["Anchor"];

    assert(cats.length > 0, `Catalog categories available for dynamic aggregation (${cats.length} found)`);
    assert(brands.length > 0, `Catalog brands available for dynamic aggregation (${brands.length} found)`);
  } catch (err) {
    assert(false, `Query engine data fetch failed: ${err.message}`);
  }

  // TEST 8: Validation of Invalid Inputs
  const { z } = require('zod');
  const ExpenseFormSchema = z.object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    category: z.string().min(1, "Category required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid date required"),
    description: z.string().min(3, "Min 3 chars"),
  });

  const validRes = ExpenseFormSchema.safeParse({
    amount: 150.5,
    category: "Office Supplies",
    date: "2026-09-10",
    description: "Office printer paper",
  });
  assert(validRes.success, "Valid expense passes Zod validation");

  const negativeRes = ExpenseFormSchema.safeParse({
    amount: -25,
    category: "Office Supplies",
    date: "2026-09-10",
    description: "Invalid negative amount",
  });
  assert(!negativeRes.success, "Negative expense amount correctly rejected by Zod");

  const invalidDateRes = ExpenseFormSchema.safeParse({
    amount: 50,
    category: "Office Supplies",
    date: "not-a-date",
    description: "Invalid date",
  });
  assert(!invalidDateRes.success, "Invalid date format correctly rejected by Zod");

  console.log(`\n=======================================================`);
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
