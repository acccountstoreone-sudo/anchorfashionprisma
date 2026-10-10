const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
Promise.all([
  supabase.from('categories').select('*'),
  supabase.from('brands').select('*')
]).then(([cats, brands]) => {
  console.log('categories:', JSON.stringify(cats.data, null, 2));
  console.log('brands:', JSON.stringify(brands.data, null, 2));
}).catch(console.error);
