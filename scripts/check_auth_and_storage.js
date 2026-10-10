const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuthAndStorage() {
  console.log('--- SUPABASE AUTH USERS ---');
  const { data: userData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error('User list error:', userErr);
  } else {
    console.log(`Found ${userData.users.length} users:`);
    for (const u of userData.users) {
      console.log(`- ${u.id}: ${u.email} (banned: ${u.banned_until}, confirmed: ${u.email_confirmed_at})`);
    }
  }

  console.log('\n--- SUPABASE STORAGE BUCKETS ---');
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) {
    console.error('Bucket list error:', bucketErr);
  } else {
    console.log(`Found ${buckets.length} buckets:`);
    for (const b of buckets) {
      console.log(`- Bucket: ${b.name} (id: ${b.id}, public: ${b.public})`);
      const { data: files, error: filesErr } = await supabase.storage.from(b.name).list('', { limit: 100 });
      if (files) {
        console.log(`  Items in root: ${files.length}`);
      }
    }
  }
}

checkAuthAndStorage().catch(console.error);
