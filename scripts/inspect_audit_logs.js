const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTriggerAndLogs() {
  const { data: logs, error: lErr } = await supabase.from('product_audit_logs').select('*').limit(5);
  console.log('product_audit_logs select:', logs, lErr);

  // Let's try inserting a dummy log with null product_id or see if product_id is nullable
  const { data: testIns, error: tErr } = await supabase.from('product_audit_logs').insert({
    action: 'TEST'
  }).select();
  console.log('Insert test into product_audit_logs:', testIns, tErr);
}

inspectTriggerAndLogs().catch(console.error);
