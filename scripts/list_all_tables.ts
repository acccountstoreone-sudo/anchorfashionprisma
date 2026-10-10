import { createAdminClient } from "../lib/supabase/admin-client";
import dotenv from "dotenv";
dotenv.config();

const supabase = createAdminClient();

async function run() {
  const candidateTables = [
    'warehouses', 'warehouse_zones', 'warehouse_bins', 'warehouse_racks', 'racks', 'shelves',
    'inventory_levels', 'stock_movements', 'stock_transfers', 'transfers', 'transfer_items',
    'stock_adjustments', 'inventory_adjustments', 'inventory_audits', 'inventory_audit_items',
    'purchase_orders', 'purchase_order_items', 'suppliers', 'products', 'variants', 'categories',
    'audit_logs', 'profiles', 'roles', 'permissions', 'user_roles', 'role_permissions'
  ];

  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error) {
      console.log(`[FOUND] ${t} -> cols:`, data && data[0] ? Object.keys(data[0]) : '(empty table)');
    } else {
      console.log(`[NOT FOUND] ${t} -> ${error.message}`);
    }
  }
}

run();
