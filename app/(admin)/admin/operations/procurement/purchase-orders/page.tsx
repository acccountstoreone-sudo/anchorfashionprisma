import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PurchaseOrdersClient } from "@/features/inventory/components/PurchaseOrdersClient";

export const metadata: Metadata = {
  title: "Purchase Orders | Anchor Fashion Enterprise",
  description: "Manage Procurement and Purchase Orders",
};

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();
  const { data: pos } = await supabase
    .from("procurement_orders")
    .select("*, supplier_profiles(company_name), warehouses(name)")
    .order("created_at", { ascending: false });

  return <PurchaseOrdersClient pos={pos || []} />;
}
