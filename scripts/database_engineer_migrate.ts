import { prisma } from "../lib/prisma";

async function applyDatabaseEngineerMigrations() {
  console.log("================================================================================");
  console.log("🛠️  APPLYING DATABASE ENGINEER PERFORMANCE & INTEGRITY MIGRATIONS");
  console.log("================================================================================\n");

  const executeSql = async (name: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ [APPLIED] ${name}`);
    } catch (err: any) {
      if (err.message?.includes("already exists") || err.message?.includes("does not exist")) {
        console.log(`ℹ️ [SKIPPED/EXISTS] ${name}: ${err.message.split("\n")[0]}`);
      } else {
        console.error(`❌ [FAILED] ${name}:`, err.message);
      }
    }
  };

  // 1. Enable pg_trgm extension for fast search
  console.log("--- 1. Extensions ---");
  await executeSql("Enable pg_trgm extension", `CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  // 2. Add Missing Foreign Key Indexes
  console.log("\n--- 2. Foreign Key Indexes ---");
  await executeSql(
    "Index cart_items(product_id)",
    `CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);`
  );
  await executeSql(
    "Index cart_items(variant_id)",
    `CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);`
  );
  await executeSql(
    "Index wishlist_items(product_id)",
    `CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON wishlist_items(product_id);`
  );
  await executeSql(
    "Index product_tags(tag_id)",
    `CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id);`
  );
  await executeSql(
    "Index role_permissions(permission_id)",
    `CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);`
  );
  await executeSql(
    "Index branch_transfers(source_warehouse_id)",
    `CREATE INDEX IF NOT EXISTS idx_branch_transfers_source_wh ON branch_transfers(source_warehouse_id);`
  );

  // 3. Drop Redundant / Duplicate Indexes
  console.log("\n--- 3. Drop Redundant Indexes ---");
  await executeSql(
    "Drop redundant orders_status_idx",
    `DROP INDEX IF EXISTS orders_status_idx;`
  );
  await executeSql(
    "Drop redundant orders_order_number_idx",
    `DROP INDEX IF EXISTS orders_order_number_idx;`
  );
  await executeSql(
    "Drop redundant product_categories_product_id_idx",
    `DROP INDEX IF EXISTS product_categories_product_id_idx;`
  );
  await executeSql(
    "Drop redundant idx_variants_sku",
    `DROP INDEX IF EXISTS idx_variants_sku;`
  );

  // 4. Create Partial & Special Performance Indexes
  console.log("\n--- 4. Partial & Performance Indexes ---");
  await executeSql(
    "Partial Index orders(reservation_expires_at) for Cron Sweeps",
    `CREATE INDEX IF NOT EXISTS idx_orders_reservation_expiry ON orders(reservation_expires_at) WHERE reservation_expires_at IS NOT NULL;`
  );
  await executeSql(
    "Partial Index products active & non-deleted for Storefront Browsing",
    `CREATE INDEX IF NOT EXISTS idx_products_active_created ON products(created_at DESC) WHERE status = 'ACTIVE' AND deleted_at IS NULL;`
  );
  await executeSql(
    "GIN Trigram Index on products(name) for Fuzzy / Infix Search",
    `CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);`
  );

  // 5. Add Database Check Constraints for Data Integrity
  console.log("\n--- 5. Data Integrity Check Constraints ---");
  await executeSql(
    "Check constraint: inventory_levels.quantity_available >= 0",
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_levels_qty_available') THEN
         ALTER TABLE inventory_levels ADD CONSTRAINT chk_inventory_levels_qty_available CHECK (quantity_available >= 0);
       END IF;
     END $$;`
  );
  await executeSql(
    "Check constraint: inventory_levels.quantity_reserved >= 0",
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_levels_qty_reserved') THEN
         ALTER TABLE inventory_levels ADD CONSTRAINT chk_inventory_levels_qty_reserved CHECK (quantity_reserved >= 0);
       END IF;
     END $$;`
  );
  await executeSql(
    "Check constraint: orders.total_amount >= 0",
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_total_amount') THEN
         ALTER TABLE orders ADD CONSTRAINT chk_orders_total_amount CHECK (total_amount >= 0);
       END IF;
     END $$;`
  );
  await executeSql(
    "Check constraint: products.base_price >= 0",
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_base_price') THEN
         ALTER TABLE products ADD CONSTRAINT chk_products_base_price CHECK (base_price >= 0);
       END IF;
     END $$;`
  );

  console.log("\n================================================================================");
  console.log("✅ DATABASE MIGRATIONS COMPLETED");
  console.log("================================================================================\n");
}

applyDatabaseEngineerMigrations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
