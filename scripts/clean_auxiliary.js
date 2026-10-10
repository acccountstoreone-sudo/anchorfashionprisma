const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanRemaining() {
  console.log('Cleaning carts...');
  await supabase.from('cart_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('carts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Cleaning notifications...');
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Cleaning support_agents...');
  await supabase.from('support_agents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Cleaning storage buckets...');
  const buckets = ['products', 'banners', 'blog_images', 'media', 'review_images', 'collections'];
  for (const b of buckets) {
    const { data: files } = await supabase.storage.from(b).list('', { limit: 100 });
    if (files && files.length > 0) {
      const filePaths = files.map(f => f.name);
      console.log(`Deleting ${filePaths.length} files from bucket '${b}'...`);
      await supabase.storage.from(b).remove(filePaths);
    }
  }

  console.log('Done cleaning remaining auxiliary tables & storage!');
}

cleanRemaining().catch(console.error);
