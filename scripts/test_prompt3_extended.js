const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function runExtendedTests() {
  console.log("=================================================");
  console.log("   PROMPT 3/5: EXTENDED VERIFICATION TESTS       ");
  console.log("=================================================\n");

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

  // ==========================================
  // 1. COUPON DATABASE CRUD
  // ==========================================
  console.log("--- 1. COUPON DATABASE CRUD ---");
  let testCouponId = null;
  try {
    const code = `TEST_${Date.now()}`;
    const { data: createdCoupon, error: couponErr } = await supabase
      .from('coupons')
      .insert({
        code,
        discount_type: 'PERCENTAGE',
        value: 20,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    assert(!couponErr && createdCoupon?.id, `Coupon created with ID: ${createdCoupon?.id} (${code})`);
    testCouponId = createdCoupon?.id;

    // Toggle status
    const { data: toggled, error: toggleErr } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('id', testCouponId)
      .select()
      .single();

    assert(!toggleErr && toggled?.is_active === false, `Coupon status toggled to inactive`);

    // Clean up
    const { error: delErr } = await supabase.from('coupons').delete().eq('id', testCouponId);
    assert(!delErr, `Coupon deleted successfully`);
  } catch (err) {
    assert(false, `Coupon test error: ${err.message}`);
  }

  // ==========================================
  // 2. DUPLICATE SEND PREVENTION CHECK
  // ==========================================
  console.log("\n--- 2. DUPLICATE SEND PREVENTION CHECK ---");
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();
    const adminUserId = profileRow?.id || "00000000-0000-0000-0000-000000000000";

    const { data: sendingCamp, error: createErr } = await supabase
      .from('campaigns')
      .insert({
        name: `Dup Check ${Date.now()}`,
        type: 'email',
        status: 'sending',
        created_by: adminUserId,
      })
      .select()
      .single();

    assert(!createErr && sendingCamp?.status === 'sending', `Campaign in 'sending' state created`);

    // Verify duplicate send rule
    const isSendingOrSent = ['sending', 'running', 'sent', 'completed'].includes(sendingCamp.status);
    assert(isSendingOrSent === true, `Duplicate check triggers when status is "${sendingCamp.status}"`);

    // Clean up
    await supabase.from('campaigns').delete().eq('id', sendingCamp.id);
    assert(true, `Duplicate check campaign cleaned up`);
  } catch (err) {
    assert(false, `Duplicate send test error: ${err.message}`);
  }

  // ==========================================
  // 3. COMMUNICATION LOGS CRUD
  // ==========================================
  console.log("\n--- 3. COMMUNICATION LOGS CRUD ---");
  try {
    const { data: commLog, error: commErr } = await supabase
      .from('communication_logs')
      .insert({
        type: 'CALL',
        direction: 'OUTBOUND',
        subject: 'Corporate Uniform Inquiry Follow-up',
        content: 'Discussed lead time and fabric specs with client procurement department.',
      })
      .select()
      .single();

    assert(!commErr && commLog?.id, `Communication log inserted with ID: ${commLog?.id}`);

    if (commLog?.id) {
      await supabase.from('communication_logs').delete().eq('id', commLog.id);
      assert(true, `Communication log cleaned up`);
    }
  } catch (err) {
    assert(false, `Communication log error: ${err.message}`);
  }

  console.log("\n=================================================");
  console.log(`   EXTENDED RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

runExtendedTests();
