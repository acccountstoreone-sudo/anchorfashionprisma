const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const current = await prisma.$queryRawUnsafe(`SELECT current_schema(), current_database();`);
  console.log('CURRENT:', current);

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('warehouses', 'warehouse_zones', 'warehouse_bins', 'warehouse_racks', 'inventory_levels', 'stock_movements', 'audit_logs');
  `);
  console.log('TABLES FOUND:', tables);
}

main().then(() => prisma.$disconnect()).catch(console.error);
