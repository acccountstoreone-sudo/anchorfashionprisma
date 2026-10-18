const { Client } = require('pg');
const dns = require('dns');
require('dotenv').config();

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function check() {
  let client;
  let attempts = 0;
  while (attempts < 5) {
    try {
      attempts++;
      client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 30000 });
      await client.connect();
      break;
    } catch (e) {
      if (attempts >= 5) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.log("Connected to PostgreSQL DB!\n");


  const tables = ['categories', 'banners', 'coupons', 'promotions', 'flash_sales', 'announcements', 'marketing_campaigns'];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT count(*) FROM ${t}`);
      console.log(`✓ ${t}: ${res.rows[0].count} rows saved in database`);
    } catch (e) {
      console.log(`${t} error: ${e.message}`);
    }
  }

  // Also show sample saved coupons
  const couponRes = await client.query("SELECT code, discount_type, discount_value, min_order_amount, is_active FROM coupons");
  console.log("\nSaved Coupons in DB:", couponRes.rows);

  // Also show sample saved banners
  const bannerRes = await client.query("SELECT title, placement, is_active FROM banners");
  console.log("\nSaved Banners in DB:", bannerRes.rows);

  await client.end();
}

check().catch(console.error);
