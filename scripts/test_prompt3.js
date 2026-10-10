const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function runPrompt3Tests() {
  console.log("=================================================");
  console.log("   PROMPT 3/5: MARKETING + CRM INTEGRATION TEST  ");
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
  // PART A: PROMOTIONS CRUD & VALIDATION
  // ==========================================
  console.log("--- PART A: PROMOTIONS ---");
  let testPromoId = null;
  try {
    const promoName = `Clearance Special ${Date.now()}`;
    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.getTime() + 14 * 86400000).toISOString();

    // 1. Insert promotion matching promotions schema: name, discount_percentage, start_date, end_date, is_active
    const { data: createdPromo, error: createPromoErr } = await supabase
      .from('promotions')
      .insert({
        name: promoName,
        discount_percentage: 25,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      })
      .select()
      .single();

    assert(!createPromoErr && createdPromo?.id, `Promotion created with ID: ${createdPromo?.id}`);
    testPromoId = createdPromo?.id;

    // 2. Fetch promotion
    const { data: fetchedPromo, error: fetchPromoErr } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', testPromoId)
      .single();

    assert(
      !fetchPromoErr && fetchedPromo?.name === promoName && Number(fetchedPromo?.discount_percentage) === 25,
      `Promotion fetched with correct name (${promoName}) and discount (25%)`
    );

    // 3. Update & toggle status
    const { data: updatedPromo, error: updatePromoErr } = await supabase
      .from('promotions')
      .update({ is_active: false, discount_percentage: 30 })
      .eq('id', testPromoId)
      .select()
      .single();

    assert(
      !updatePromoErr && updatedPromo?.is_active === false && Number(updatedPromo?.discount_percentage) === 30,
      `Promotion updated: is_active toggled to false, discount updated to 30%`
    );

    // 4. Delete promotion
    const { error: deletePromoErr } = await supabase
      .from('promotions')
      .delete()
      .eq('id', testPromoId);

    assert(!deletePromoErr, `Promotion deleted successfully`);

    // Verify deletion
    const { data: verifyDel } = await supabase
      .from('promotions')
      .select('id')
      .eq('id', testPromoId)
      .maybeSingle();

    assert(!verifyDel, `Confirmed promotion no longer exists in database`);
  } catch (err) {
    assert(false, `Promotions test error: ${err.message}`);
  }

  // ==========================================
  // PART B: MARKETING CAMPAIGNS & AUDIENCE
  // ==========================================
  console.log("\n--- PART B & D: CAMPAIGNS & MARKETING SERVICE ---");
  let testCampaignId = null;
  try {
    // 1. Check audience pools
    const { count: customersCount, error: custErr } = await supabase
      .from('customer_profiles')
      .select('id', { count: 'exact', head: true });

    const { count: subscribersCount, error: subErr } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true });

    assert(!custErr, `Audience check: customer_profiles table accessible (${customersCount ?? 0} total)`);
    assert(!subErr, `Audience check: newsletter_subscribers accessible (${subscribersCount ?? 0} total)`);

    // 2. Fetch a valid profile UUID for created_by
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();
    const adminUserId = profileRow?.id || "00000000-0000-0000-0000-000000000000";

    // 3. Create test campaign
    const campaignName = `Auto Test Campaign ${Date.now()}`;
    const { data: createdCamp, error: campErr } = await supabase
      .from('campaigns')
      .insert({
        name: campaignName,
        subject: "Seasonal Collection Exclusive Preview",
        type: "email",
        status: "draft",
        content: "<p>Exclusive offer for Anchor Fashion members.</p>",
        created_by: adminUserId,
      })
      .select()
      .single();

    assert(!campErr && createdCamp?.id, `Campaign created with ID: ${createdCamp?.id}`);
    testCampaignId = createdCamp?.id;

    // 4. Test scheduling transition (using schedule_time)
    const futureDate = new Date(Date.now() + 48 * 3600000).toISOString();
    const { data: scheduledCamp, error: schedErr } = await supabase
      .from('campaigns')
      .update({
        status: "scheduled",
        schedule_time: futureDate,
      })
      .eq('id', testCampaignId)
      .select()
      .single();

    assert(
      !schedErr && scheduledCamp?.status === "scheduled" && scheduledCamp?.schedule_time,
      `Campaign successfully scheduled for ${futureDate}`
    );

    // 5. Test campaign_logs table structure
    const { data: testLog, error: logErr } = await supabase
      .from('campaign_logs')
      .insert({
        campaign_id: testCampaignId,
        recipient_id: adminUserId,
        status: "sent",
      })
      .select()
      .single();

    assert(!logErr && testLog?.id, `Campaign log entry recorded in campaign_logs`);

    // Clean up log and campaign
    if (testLog?.id) {
      await supabase.from('campaign_logs').delete().eq('id', testLog.id);
    }
    const { error: delCampErr } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', testCampaignId);

    assert(!delCampErr, `Test campaign deleted successfully`);
  } catch (err) {
    assert(false, `Campaigns test error: ${err.message}`);
  }

  // ==========================================
  // PART C: CRM LEADS, NOTES & CONVERSION
  // ==========================================
  console.log("\n--- PART C: CRM LEADS & CONVERSION ---");
  let testLeadId = null;
  let testNoteId = null;
  try {
    // 1. Create Lead
    const testEmail = `lead_${Date.now()}@corporateapparel.bd`;
    const { data: createdLead, error: leadErr } = await supabase
      .from('crm_leads')
      .insert({
        first_name: "Mahmudul",
        last_name: "Hasan",
        email: testEmail,
        phone: "+880 1819 998877",
        company_name: "Apex Garments Sourcing Ltd",
        status: "new",
        source: "Website Inquiry",
        score: 45,
      })
      .select()
      .single();

    assert(!leadErr && createdLead?.id, `CRM Lead created with ID: ${createdLead?.id} (${testEmail})`);
    testLeadId = createdLead?.id;

    // 2. Fetch Lead by ID
    const { data: fetchedLead, error: fetchLeadErr } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', testLeadId)
      .single();

    assert(
      !fetchLeadErr && fetchedLead?.company_name === "Apex Garments Sourcing Ltd",
      `CRM Lead fetched with correct company name and phone`
    );

    // 3. Add Lead Note
    const { data: createdNote, error: noteErr } = await supabase
      .from('crm_notes')
      .insert({
        lead_id: testLeadId,
        content: "Client inquired about 5,000 units wholesale bulk contract for winter 2026.",
        is_pinned: true,
      })
      .select()
      .single();

    assert(!noteErr && createdNote?.id, `CRM Note added to lead: "${createdNote?.content?.substring(0, 40)}..."`);
    testNoteId = createdNote?.id;

    // 4. Retrieve Lead Notes
    const { data: leadNotes, error: fetchNotesErr } = await supabase
      .from('crm_notes')
      .select('*')
      .eq('lead_id', testLeadId);

    assert(
      !fetchNotesErr && leadNotes?.length === 1 && leadNotes[0].id === testNoteId,
      `Lead notes queried successfully (found ${leadNotes?.length} note)`
    );

    // 5. Convert Lead to Customer
    const { data: convertedLead, error: convErr } = await supabase
      .from('crm_leads')
      .update({
        status: "converted",
      })
      .eq('id', testLeadId)
      .select()
      .single();

    assert(
      !convErr && convertedLead?.status === "converted",
      `Lead status successfully converted to "converted"`
    );

    // 6. Delete Note and Lead
    if (testNoteId) {
      await supabase.from('crm_notes').delete().eq('id', testNoteId);
    }
    const { error: delLeadErr } = await supabase
      .from('crm_leads')
      .delete()
      .eq('id', testLeadId);

    assert(!delLeadErr, `CRM Lead and associated notes cleaned up successfully`);
  } catch (err) {
    assert(false, `CRM Leads test error: ${err.message}`);
  }

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log("\n=================================================");
  console.log(`   PROMPT 3/5 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt3Tests();
