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
  console.log("Anchor Fashion - Menus System Verification");
  console.log("=========================================");

  // 1. Query existing menus
  console.log("\n[1] Querying existing menus in 'cms_menus'...");
  const { data: existing, error: err1 } = await adminClient
    .from("cms_menus")
    .select("*")
    .order("created_at", { ascending: true });

  if (err1) throw new Error("Query error: " + err1.message);
  console.log(` -> Found ${existing.length} existing menu(s):`);
  existing.forEach((m) => {
    console.log(`    • [${m.location}] "${m.name}" - ${Array.isArray(m.menu_structure) ? m.menu_structure.length : 0} items (ID: ${m.id})`);
  });

  // 2. Test Creating / Upserting a Test Menu
  console.log("\n[2] Creating test menu 'test_verify_menu'...");
  const initialItems = [
    { label: "New Arrivals", url: "/products?sort=newest", target: "_self" },
    { label: "Summer Dresses", url: "/category/dresses", target: "_self" },
  ];

  const { data: created, error: err2 } = await adminClient
    .from("cms_menus")
    .upsert(
      {
        location: "test_verify_menu",
        name: "Test Verification Menu",
        menu_structure: initialItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location" }
    )
    .select()
    .single();

  if (err2) throw new Error("Create menu error: " + err2.message);
  console.log(` -> Created test menu with ID: ${created.id}`);

  // 3. Test Adding an Item (Simulating Add Item dialog action)
  console.log("\n[3] Adding item to 'test_verify_menu'...");
  const updatedItems = [
    ...created.menu_structure,
    { label: "Lookbook", url: "/lookbook", target: "_blank" },
  ];

  const { data: updatedWithItem, error: err3 } = await adminClient
    .from("cms_menus")
    .upsert(
      {
        location: "test_verify_menu",
        name: "Test Verification Menu",
        menu_structure: updatedItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location" }
    )
    .select()
    .single();

  if (err3) throw new Error("Add item error: " + err3.message);
  console.log(` -> Added item successfully. Total items: ${updatedWithItem.menu_structure.length}`);
  updatedWithItem.menu_structure.forEach((it, idx) => {
    console.log(`    ${idx + 1}. [${it.target}] ${it.label} -> ${it.url}`);
  });

  // 4. Test Deleting the Test Menu
  console.log("\n[4] Deleting test menu...");
  const { error: err4 } = await adminClient
    .from("cms_menus")
    .delete()
    .eq("id", created.id);

  if (err4) throw new Error("Delete error: " + err4.message);
  console.log(" -> Test menu deleted cleanly.");

  console.log("\n=========================================");
  console.log("SUCCESS: All Menus System database operations verified!");
  console.log("=========================================");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
