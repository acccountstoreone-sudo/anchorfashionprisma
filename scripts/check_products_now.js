const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: all, count } = await supabase
    .from('products')
    .select('id, name, status, deleted_at, is_featured, created_at', { count: 'exact' });

  console.log(`Total products in Supabase table 'products': ${count}`);
  console.log("Statuses count:");
  const statusCounts = {};
  all?.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  console.log(statusCounts);

  const active = all?.filter(p => p.status === 'ACTIVE' && !p.deleted_at);
  console.log(`Active (non-deleted) products: ${active?.length}`);

  console.log("\nSample 5 products:", all?.slice(0, 5));
}

main().catch(console.error);
