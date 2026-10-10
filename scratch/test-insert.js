import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('orders').insert({
    id: 'b149bbf2-89db-432d-986c-18cc871d3744',
    order_number: `ORD-TEST-${Date.now()}`,
    customer_id: 'bc067dfd-3df4-46ce-bb93-a6e8b603ee33',
    status: 'processing',
    grand_total: 100
  });
  console.log('Error:', error);
}
test();
