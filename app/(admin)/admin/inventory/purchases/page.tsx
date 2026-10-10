import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { PurchaseOrdersClient } from "@/features/inventory/components/PurchaseOrdersClient";

export const metadata: Metadata = {
  title: "Purchase Orders | Anchor Fashion",
  description: "Manage procurement, supplier orders, and warehouse goods receiving.",
};

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const supabase = createAdminClient();
  const { data: pos } = await supabase
    .from("procurement_orders")
    .select("*, supplier_profiles(company_name), warehouses(name)")
    .order("created_at", { ascending: false });

  return <PurchaseOrdersClient pos={pos || []} />;
}
