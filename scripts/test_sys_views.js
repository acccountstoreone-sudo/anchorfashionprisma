require('dotenv').config();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const testPaths = [
    '/rest/v1/pg_trigger',
    '/rest/v1/information_schema/triggers',
  ];

  for (const p of testPaths) {
    const res = await fetch(`${url}${p}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    console.log(`Path ${p}: status ${res.status}`);
    if (res.ok) {
      console.log(await res.json());
    }
  }
}

main().catch(console.error);
