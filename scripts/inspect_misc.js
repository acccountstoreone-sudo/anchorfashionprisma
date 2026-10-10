const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectMisc() {
  const { data: wh } = await supabase.from('warehouses').select('*');
  console.log('warehouses:', wh);

  const { data: rewards } = await supabase.from('reward_catalog').select('*');
  console.log('reward_catalog:', rewards);

  const { data: faqs } = await supabase.from('faqs').select('*');
  console.log('faqs count:', faqs ? faqs.length : 0);

  const { data: cms } = await supabase.from('cms_pages').select('*');
  console.log('cms_pages:', cms);

  const { data: menus } = await supabase.from('cms_menus').select('*');
  console.log('cms_menus:', menus);
}

inspectMisc().catch(console.error);
