import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { AuditsClient } from "@/features/inventory/components/AuditsClient";
import { getWarehouses } from "@/app/actions/admin/procurement.actions";

export const metadata: Metadata = {
  title: "Inventory Audits | Anchor Fashion",
  description: "Manage cycle counts, blind verifications, and physical inventory reconciliation.",
};

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const supabase = createAdminClient();

  const [{ data: audits }, whRes] = await Promise.all([
    supabase
      .from("inventory_audits")
      .select("*, warehouses(id, name, warehouse_code)")
      .order("created_at", { ascending: false }),
    getWarehouses(),
  ]);

  return (
    <AuditsClient
      audits={audits || []}
      allWarehouses={whRes.success && whRes.data ? whRes.data : []}
    />
  );
}
