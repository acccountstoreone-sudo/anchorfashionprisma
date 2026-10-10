import { createAdminClient } from "../lib/supabase/admin-client";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  const supabase = createAdminClient();
  
  // 1. Try insert into supplier_profiles
  const { data: sup, error: err1 } = await supabase
    .from("supplier_profiles")
    .insert({
      company_name: "Apex Footwear Ltd",
      contact_person: "Mr. Syed",
      email: "contact@apexfootwear.com",
      phone: "+8801711998877",
      performance_score: 4.9,
      status: "ACTIVE",
    })
    .select()
    .single();

  console.log("Insert supplier_profiles:", err1 ? err1.message : "SUCCESS! id: " + sup?.id);

  // 2. Select from supplier_profiles
  const { data: list, error: err2 } = await supabase
    .from("supplier_profiles")
    .select("*");
  console.log("Select supplier_profiles count:", list?.length, err2?.message);

  // 3. Clean up test
  if (sup?.id) {
    await supabase.from("supplier_profiles").delete().eq("id", sup.id);
  }
}

check().catch(console.error);
