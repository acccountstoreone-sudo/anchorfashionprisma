const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("Checking product_audit_logs...");
  const { data, count, error } = await supabase.from('product_audit_logs').select('*', { count: 'exact' });
  console.log("product_audit_logs count:", count, "error:", error);
}

main().catch(console.error);
