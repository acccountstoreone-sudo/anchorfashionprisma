const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
  console.log('--- ALL PRODUCTS WITH VARIANTS ---');
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select(`
      id, name, slug, base_price, status,
      variants (
        id, sku, price_override, sale_price, is_active, attributes,
        inventory_levels (quantity_available, reorder_point)
      ),
      product_media (id, variant_id, url, is_primary, display_order)
    `)
    .eq('status', 'ACTIVE');

  if (pErr) {
    console.error('Error:', pErr);
    return;
  }

  console.log(`Total active products: ${products.length}`);
  for (const p of products) {
    console.log(`\nProduct: "${p.name}" (slug: ${p.slug}, base_price: ${p.base_price})`);
    console.log(`  Variants count: ${p.variants?.length || 0}`);
    if (p.variants?.length > 0) {
      for (const v of p.variants) {
        const invTotal = (v.inventory_levels || []).reduce((acc, i) => acc + (i.quantity_available || 0), 0);
        console.log(`    Variant ${v.id}: SKU=${v.sku}, price_override=${v.price_override}, sale_price=${v.sale_price}, attributes=${JSON.stringify(v.attributes)}, stock=${invTotal}`);
      }
    }
    const mediaWithVariant = (p.product_media || []).filter(m => m.variant_id);
    console.log(`  Media count: ${p.product_media?.length || 0} (${mediaWithVariant.length} variant-specific)`);
  }

  const { data: warehouses } = await supabase.from('warehouses').select('*');
  console.log('\nWarehouses:', warehouses?.length);

  const { data: flashSales } = await supabase.from('flash_sales').select('*');
  console.log('Flash Sales:', flashSales?.length);
}

inspect();
