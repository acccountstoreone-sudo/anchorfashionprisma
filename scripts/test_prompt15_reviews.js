const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTests() {
  console.log("=== Testing Prompt 15: Verified Customer Reviews ===");

  try {
    // 1. Check if the review_images bucket exists
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) throw bucketErr;

    const hasBucket = buckets.some(b => b.name === 'review_images');
    if (hasBucket) {
      console.log("✅ 'review_images' storage bucket exists.");
    } else {
      console.log("❌ 'review_images' storage bucket is missing.");
    }

    // 2. Check if product_review_stats view exists
    const { data: stats, error: statsErr } = await supabase
      .from('product_review_stats')
      .select('*')
      .limit(1);
    
    if (statsErr) {
      console.log("❌ 'product_review_stats' view check failed:", statsErr.message);
    } else {
      console.log("✅ 'product_review_stats' view exists.");
    }

    // 3. Test Verified Purchase Backend Logic (simulated)
    // Since we don't have a guaranteed user token here, we will just verify the schema of customer_reviews.
    const { data: cols, error: colErr } = await supabase
      .from('customer_reviews')
      .select('id, images, order_id, is_approved')
      .limit(1);

    if (colErr && colErr.code !== 'PGRST116') {
      console.log("❌ Failed to query customer_reviews schema:", colErr.message);
    } else {
      console.log("✅ 'customer_reviews' schema has required columns (images, order_id, is_approved).");
    }

    console.log("=== All Tests Completed ===");
  } catch (err) {
    console.error("Test failed with unexpected error:", err);
  }
}

runTests();
