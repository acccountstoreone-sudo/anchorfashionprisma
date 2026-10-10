const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkAll() {
  const specRes = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  if (!specRes.ok) {
    console.error('Failed to get spec:', specRes.status, specRes.statusText);
    return;
  }
  const spec = await specRes.json();
  const paths = Object.keys(spec.paths || {}).filter(p => p !== '/' && p.startsWith('/'));
  const tableNames = paths.map(p => p.slice(1));
  console.log(`Found ${tableNames.length} tables/views in Supabase OpenAPI spec.`);

  const nonEmpty = [];
  for (const table of tableNames) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'count=exact',
          'Range-Unit': 'items',
          'Range': '0-0'
        }
      });
      const cr = res.headers.get('content-range');
      if (cr) {
        const count = cr.split('/')[1];
        if (count && count !== '0' && count !== '*') {
          nonEmpty.push({ table, count: parseInt(count, 10) });
        }
      }
    } catch (e) {
      // skip
    }
  }

  console.log('\n--- TABLES WITH DATA (> 0 ROWS) ---');
  for (const item of nonEmpty) {
    console.log(`${item.table}: ${item.count} rows`);
  }
}

checkAll().catch(console.error);
