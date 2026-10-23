import { prisma } from "../lib/prisma";

interface MissingFkIndex {
  table_name: string;
  fk_name: string;
  fk_columns: string;
  referenced_table: string;
}

interface RedundantIndex {
  table_name: string;
  redundant_index: string;
  covering_index: string;
  redundant_cols: string;
  covering_cols: string;
}

interface TableStat {
  table_name: string;
  total_size: string;
  table_size: string;
  index_size: string;
  estimated_rows: number;
}

async function runDatabaseEngineerAudit() {
  console.log("================================================================================");
  console.log("🗄️  DATABASE ENGINEER (DBA) COMPREHENSIVE POSTGRESQL AUDIT");
  console.log("================================================================================\n");

  try {
    // 1. Connection & Version Check
    const versionRes: any[] = await prisma.$queryRawUnsafe(`SELECT version();`);
    console.log(`📡 [PG ENGINE] Version: ${versionRes[0]?.version || "Unknown"}`);

    const extRes: any[] = await prisma.$queryRawUnsafe(
      `SELECT extname, extversion FROM pg_extension ORDER BY extname;`
    );
    console.log(`🔌 [EXTENSIONS] Installed (${extRes.length}): ${extRes.map((e) => `${e.extname} (${e.extversion})`).join(", ")}\n`);

    // 2. Audit Missing Foreign Key Indexes
    console.log("--------------------------------------------------------------------------------");
    console.log("🔍 [AUDIT 1] Unindexed Foreign Keys (Causes Sequential Scans & Table Locks on Cascade)");
    console.log("--------------------------------------------------------------------------------");
    const missingFkSql = `
      SELECT
        c.conrelid::regclass::text AS table_name,
        c.conname AS fk_name,
        STRING_AGG(a.attname, ', ' ORDER BY x.n) AS fk_columns,
        c.confrelid::regclass::text AS referenced_table
      FROM pg_constraint c
      CROSS JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS x(attnum, n)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = x.attnum
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_index i
          WHERE i.indrelid = c.conrelid
            AND (i.indkey::smallint[])[0:CARDINALITY(c.conkey)-1] = c.conkey
        )
      GROUP BY c.conrelid, c.conname, c.confrelid
      ORDER BY table_name, fk_name;
    `;
    const missingFks: MissingFkIndex[] = await prisma.$queryRawUnsafe(missingFkSql);
    if (missingFks.length === 0) {
      console.log("✅ All foreign keys have supporting index prefixes! Zero unindexed FKs found.");
    } else {
      console.log(`⚠️ Found ${missingFks.length} unindexed foreign keys:`);
      missingFks.forEach((fk, idx) => {
        console.log(`  ${idx + 1}. Table: "${fk.table_name}" | Column(s): [${fk.fk_columns}] | FK: ${fk.fk_name} -> References: "${fk.referenced_table}"`);
      });
    }

    // 3. Audit Redundant / Duplicate Indexes
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🔍 [AUDIT 2] Duplicate / Redundant Indexes (Waste Write I/O & Memory)");
    console.log("--------------------------------------------------------------------------------");
    const redundantIndexSql = `
      SELECT
        t.relname AS table_name,
        idx1.relname AS redundant_index,
        idx2.relname AS covering_index,
        pg_get_indexdef(i1.indexrelid) AS redundant_def,
        pg_get_indexdef(i2.indexrelid) AS covering_def
      FROM pg_index i1
      JOIN pg_index i2 ON i1.indrelid = i2.indrelid AND i1.indexrelid <> i2.indexrelid
      JOIN pg_class t ON t.oid = i1.indrelid
      JOIN pg_class idx1 ON idx1.oid = i1.indexrelid
      JOIN pg_class idx2 ON idx2.oid = i2.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND i1.indisunique = false
        AND (
          (i1.indkey::text = i2.indkey::text)
          OR (i2.indkey::text LIKE i1.indkey::text || ' %')
        )
      ORDER BY t.relname;
    `;
    const redundantIndexes: any[] = await prisma.$queryRawUnsafe(redundantIndexSql);
    if (redundantIndexes.length === 0) {
      console.log("✅ Zero redundant or duplicate indexes found.");
    } else {
      console.log(`⚠️ Found ${redundantIndexes.length} redundant or overlapping indexes:`);
      redundantIndexes.slice(0, 10).forEach((idx, i) => {
        console.log(`  ${i + 1}. Table: "${idx.table_name}" | Redundant: "${idx.redundant_index}" covered by "${idx.covering_index}"`);
      });
    }

    // 4. Audit Table Storage & Row Estimates
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📊 [AUDIT 3] Top Database Tables by Storage (Data vs Index Distribution)");
    console.log("--------------------------------------------------------------------------------");
    const tableStatsSql = `
      SELECT
        c.relname AS table_name,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
        COALESCE(s.n_live_tup, 0)::bigint AS estimated_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
      WHERE c.relkind = 'r' AND n.nspname = 'public'
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 15;
    `;
    const tableStats: TableStat[] = await prisma.$queryRawUnsafe(tableStatsSql);
    console.table(tableStats);

    // 5. Audit Core Business Integrity: Inventory Levels Uniqueness & Anomalies
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🛡️  [AUDIT 4] Inventory Levels & Core Business Data Integrity");
    console.log("--------------------------------------------------------------------------------");

    // Check 1: Does inventory_levels have duplicate (variant_id, warehouse_id) pairs?
    const duplicateInv: any[] = await prisma.$queryRawUnsafe(`
      SELECT variant_id, warehouse_id, count(*) as count
      FROM inventory_levels
      GROUP BY variant_id, warehouse_id
      HAVING count(*) > 1;
    `);
    console.log(`• Duplicate (variant_id, warehouse_id) records in inventory_levels: ${duplicateInv.length}`);

    // Check 2: Unique constraint on (variant_id, warehouse_id) in inventory_levels
    const uniqueConstraintInv: any[] = await prisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'inventory_levels'::regclass
        AND contype IN ('u', 'p');
    `);
    console.log(`• Unique constraints / PK on inventory_levels:`);
    uniqueConstraintInv.forEach((c) => console.log(`   - ${c.conname}: ${c.def}`));

    // Check 3: Negative stock quantities in inventory_levels
    const negativeStock: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int as count
      FROM inventory_levels
      WHERE quantity_available < 0 OR quantity_reserved < 0;
    `);
    console.log(`• Records with negative quantity_available or quantity_reserved: ${negativeStock[0]?.count || 0}`);

    // Check 4: Orphan order_items (order_items where order_id doesn't exist)
    const orphanOrderItems: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int as count
      FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE o.id IS NULL;
    `);
    console.log(`• Orphaned order_items without valid order parent: ${orphanOrderItems[0]?.count || 0}`);

    // Check 5: Orphan stock_movements
    const orphanStockMovements: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int as count
      FROM stock_movements sm
      LEFT JOIN variants v ON v.id = sm.variant_id
      WHERE v.id IS NULL;
    `);
    console.log(`• Orphaned stock_movements without valid variant: ${orphanStockMovements[0]?.count || 0}`);

    // 6. Concurrency & Transaction Stress Test
    console.log("\n--------------------------------------------------------------------------------");
    console.log("⚡ [AUDIT 5] Transaction Isolation & Atomic Stock Row-Locking Test");
    console.log("--------------------------------------------------------------------------------");

    // Find a test variant and warehouse
    const testInv = await prisma.inventoryLevel.findFirst({
      where: { quantityAvailable: { gte: 10 } },
      include: { variant: true },
    });

    if (testInv) {
      console.log(`Testing atomic decrement & concurrency on Variant: ${testInv.variant.sku} (Available: ${testInv.quantityAvailable})`);
      const originalAvail = testInv.quantityAvailable;

      // Simulate 5 simultaneous atomic decrements of 2 units each = 10 units total
      const concurrencyPromises = Array.from({ length: 5 }, async (_, i) => {
        try {
          const res: any = await prisma.$executeRawUnsafe(
            `UPDATE inventory_levels 
             SET quantity_available = quantity_available - 2, 
                 quantity_reserved = quantity_reserved + 2,
                 updated_at = NOW()
             WHERE id = $1::uuid AND quantity_available >= 2;`,
            testInv.id
          );
          return { worker: i, success: res === 1 };
        } catch (e: any) {
          return { worker: i, success: false, error: e.message };
        }
      });

      const results = await Promise.all(concurrencyPromises);
      const successfulDecrements = results.filter((r) => r.success).length;

      // Verify post-concurrency state
      const postInv = await prisma.inventoryLevel.findUnique({ where: { id: testInv.id } });
      const expectedAvail = originalAvail - (successfulDecrements * 2);

      console.log(`  • Concurrent Workers executed: 5 | Successful atomic updates: ${successfulDecrements}`);
      console.log(`  • Stock Verification: Starting: ${originalAvail} | Final: ${postInv?.quantityAvailable} | Expected: ${expectedAvail}`);

      if (postInv?.quantityAvailable === expectedAvail) {
        console.log("  ✅ [PASS] Concurrency test passed with zero race condition / over-allocation!");
      } else {
        console.error("  ❌ [FAIL] Discrepancy detected during concurrent atomic execution!");
      }

      // Revert test stock
      await prisma.$executeRawUnsafe(
        `UPDATE inventory_levels 
         SET quantity_available = quantity_available + $1, 
             quantity_reserved = quantity_reserved - $1,
             updated_at = NOW()
         WHERE id = $2::uuid;`,
        successfulDecrements * 2,
        testInv.id
      );
      console.log(`  ✓ Reverted test stock increments. Current Available: ${(await prisma.inventoryLevel.findUnique({ where: { id: testInv.id } }))?.quantityAvailable}`);
    } else {
      console.log("ℹ️ No inventory level with >= 10 units available found to run concurrency test.");
    }

    console.log("\n================================================================================");
    console.log("📋 SUMMARY OF DATABASE ENGINEER FINDINGS");
    console.log("================================================================================");
    console.log(`1. Total Missing FK Indexes: ${missingFks.length}`);
    console.log(`2. Total Redundant Indexes: ${redundantIndexes.length}`);
    console.log(`3. Inventory Duplicates: ${duplicateInv.length}`);
    console.log(`4. Negative Stock Anomalies: ${negativeStock[0]?.count || 0}`);
    console.log(`5. Orphaned Items: ${orphanOrderItems[0]?.count || 0}`);
    console.log("================================================================================\n");

  } catch (err: any) {
    console.error("❌ Fatal Error during Database Engineer Audit:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseEngineerAudit();
