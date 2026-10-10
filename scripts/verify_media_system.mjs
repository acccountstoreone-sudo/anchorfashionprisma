import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runVerification() {
  console.log("=========================================");
  console.log("Anchor Fashion - Media System Verification");
  console.log("=========================================");

  // 1. Verify Storage Buckets
  console.log("\n[1] Verifying Supabase Storage 'media' bucket...");
  const { data: buckets, error: bErr } = await adminClient.storage.listBuckets();
  if (bErr) throw new Error("listBuckets error: " + bErr.message);
  const mediaBucket = buckets.find((b) => b.name === "media");
  if (!mediaBucket) throw new Error("media bucket does not exist!");
  console.log(` -> 'media' bucket exists and public: ${mediaBucket.public}`);

  // 2. Verify Table
  console.log("\n[2] Verifying 'cms_media' database table...");
  const { data: items, error: tErr } = await adminClient
    .from("cms_media")
    .select("*")
    .order("created_at", { ascending: false });
  if (tErr) throw new Error("cms_media table query error: " + tErr.message);
  console.log(` -> 'cms_media' table has ${items.length} items.`);
  items.forEach((it, idx) => {
    console.log(`    ${idx + 1}. [${it.file_type}] ${it.file_name} (${it.file_size_bytes} bytes)`);
  });

  // 3. Test Upload & Delete round-trip
  console.log("\n[3] Testing Upload to Storage and DB Insert...");
  const testBuffer = Buffer.from("Verification automated test file content");
  const testFileName = `test_verification_${Date.now()}.txt`;

  const { error: upErr } = await adminClient.storage
    .from("media")
    .upload(testFileName, testBuffer, { contentType: "text/plain", upsert: true });
  if (upErr) throw new Error("Storage upload error: " + upErr.message);
  console.log(` -> Uploaded test file to storage: media/${testFileName}`);

  const { data: pubData } = adminClient.storage.from("media").getPublicUrl(testFileName);
  console.log(` -> Public URL generated: ${pubData.publicUrl}`);

  const { data: dbItem, error: insErr } = await adminClient
    .from("cms_media")
    .insert({
      file_name: testFileName,
      file_url: pubData.publicUrl,
      file_type: "text/plain",
      file_size_bytes: testBuffer.length,
      uploaded_by: null,
    })
    .select()
    .single();
  if (insErr) throw new Error("DB insert error: " + insErr.message);
  console.log(` -> DB record created with ID: ${dbItem.id}`);

  console.log("\n[4] Testing Delete from DB and Storage...");
  const { error: delDbErr } = await adminClient.from("cms_media").delete().eq("id", dbItem.id);
  if (delDbErr) throw new Error("DB delete error: " + delDbErr.message);
  const { error: delStorageErr } = await adminClient.storage.from("media").remove([testFileName]);
  if (delStorageErr) throw new Error("Storage remove error: " + delStorageErr.message);
  console.log(` -> Successfully deleted test item from DB and Storage!`);

  console.log("\n=========================================");
  console.log("SUCCESS: All Media System tests passed!");
  console.log("=========================================");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
