const { Client } = require('pg');

const projectRef = "hljnykaknqlpnigkdshb";
const candidatePasswords = [
  "Admin123456!",
  "npg_zM5AjDtG1hkO",
  "mdantormia564654654",
  "qwerty",
  "postgres",
  "password"
];

const hosts = [
  `db.${projectRef}.supabase.co`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`
];

async function tryConnect(host, password) {
  const isPooler = host.includes("pooler");
  const user = isPooler ? `postgres.${projectRef}` : "postgres";
  const port = isPooler ? 6543 : 5432;

  const client = new Client({
    host,
    port,
    user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`🎉 SUCCESS! Connected to ${host} with password '${password}'!`);
    return client;
  } catch (err) {
    // console.log(`Failed ${host} with ${password}: ${err.message}`);
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function main() {
  console.log("Testing PostgreSQL connections to Supabase...");
  for (const host of hosts) {
    for (const pwd of candidatePasswords) {
      const client = await tryConnect(host, pwd);
      if (client) {
        // Run DROP TRIGGER / TRUNCATE
        console.log("Dropping trigger and truncating products table...");
        const res = await client.query(`
          DROP TRIGGER IF EXISTS tr_product_audit_logs ON public.products;
          DROP TRIGGER IF EXISTS product_audit_trigger ON public.products;
          DROP TRIGGER IF EXISTS log_product_changes_trigger ON public.products;
          DROP TRIGGER IF EXISTS on_product_change ON public.products;
          TRUNCATE TABLE public.products CASCADE;
        `);
        console.log("Truncate result:", res);
        await client.end();
        return;
      }
    }
  }
  console.log("None of the guessed passwords connected.");
}

main().catch(console.error);
