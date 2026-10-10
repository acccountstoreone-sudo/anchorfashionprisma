const { createAdminClient } = require('./lib/supabase/admin-client');
require('dotenv').config();

const supabase = createAdminClient();

async function run() {
  // Let's test warehouse columns:
  const { data: wh, error: whErr } = await supabase.from('warehouses').select('*').limit(1);
  console.log('warehouses sample:', wh ? Object.keys(wh[0]) : 'empty', whErr);

  // Let's test warehouse_zones
  const { data: wz, error: wzErr } = await supabase.from('warehouse_zones').select('*').limit(1);
  console.log('warehouse_zones sample:', wz ? (wz.length > 0 ? Object.keys(wz[0]) : 'empty') : 'error', wzErr);

  // Let's test warehouse_bins
  const { data: wb, error: wbErr } = await supabase.from('warehouse_bins').select('*').limit(1);
  console.log('warehouse_bins sample:', wb ? (wb.length > 0 ? Object.keys(wb[0]) : 'empty') : 'error', wbErr);

  // Let's test inventory_levels
  const { data: inv, error: invErr } = await supabase.from('inventory_levels').select('*').limit(1);
  console.log('inventory_levels sample:', inv ? Object.keys(inv[0]) : 'empty', invErr);

  // Let's test stock_movements
  const { data: sm, error: smErr } = await supabase.from('stock_movements').select('*').limit(1);
  console.log('stock_movements sample:', sm ? Object.keys(sm[0]) : 'empty', smErr);
}

run();
