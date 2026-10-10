import { createAdminClient } from "../lib/supabase/admin-client";
import dotenv from "dotenv";
dotenv.config();

const supabase = createAdminClient();

async function run() {
  const { data: wh, error: whErr } = await supabase.from('warehouses').select('*').limit(1);
  console.log('warehouses sample:', wh ? Object.keys(wh[0]) : 'empty', whErr?.message);

  const { data: wz, error: wzErr } = await supabase.from('warehouse_zones').select('*').limit(1);
  console.log('warehouse_zones sample:', wz ? Object.keys(wz[0] || {}) : 'empty', wzErr?.message);

  const { data: wb, error: wbErr } = await supabase.from('warehouse_bins').select('*').limit(1);
  console.log('warehouse_bins sample:', wb ? Object.keys(wb[0] || {}) : 'empty', wbErr?.message);

  const { data: inv, error: invErr } = await supabase.from('inventory_levels').select('*').limit(1);
  console.log('inventory_levels sample:', inv ? Object.keys(inv[0]) : 'empty', invErr?.message);

  const { data: sm, error: smErr } = await supabase.from('stock_movements').select('*').limit(1);
  console.log('stock_movements sample:', sm ? Object.keys(sm[0]) : 'empty', smErr?.message);
}

run();
