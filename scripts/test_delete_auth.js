const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDelete() {
  const { data, error } = await supabase.auth.admin.deleteUser('86f2ca0e-6c38-4314-adf3-ff0cc88d7f6e');
  console.log('Delete devsazzadalis@gmail.com result:', { data, error });
}

testDelete().catch(console.error);
