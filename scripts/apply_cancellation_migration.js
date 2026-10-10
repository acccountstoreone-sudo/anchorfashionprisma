const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Applying cancellation columns migration...");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Let's test calling pg or exec_sql if RPC exists, or using sql query
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ sql_query: "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT; ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_note TEXT;" })
  });

  console.log("RPC exec_sql Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response:", text);

  // Check if columns exist now
  const { data, error } = await supabase.from('orders').select('cancellation_reason, cancellation_note').limit(1);
  if (error) {
    console.error("Columns still missing or error:", error);
  } else {
    console.log("✅ Columns cancellation_reason & cancellation_note exist in orders table!");
  }
}

run();
