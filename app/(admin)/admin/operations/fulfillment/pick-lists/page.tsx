import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPickListsAction, getPickersAction } from "@/actions/admin/fulfillment.actions";
import { PickListsClient } from "@/features/fulfillment/components/PickListsClient";

export const metadata: Metadata = {
  title: "Order Picking & Fulfillment | Anchor Fashion Enterprise",
  description: "Manage Wave Picks, Batch Picks, and Order Fulfillment",
};

export default async function PickListsPage() {
  const supabase = await createClient();

  const [
    { count: pendingCount },
    pickListsRes,
    pickersRes,
    { data: warehouses },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "paid", "preparing", "ready_for_shipment", "pending_payment"]),
    getPickListsAction(),
    getPickersAction(),
    supabase.from("warehouses").select("id, name, warehouse_code").eq("is_active", true).order("name"),
  ]);

  const formattedWarehouses = (warehouses || []).map((w: any) => ({
    id: w.id,
    name: w.name,
    code: w.warehouse_code || "",
    warehouse_code: w.warehouse_code || "",
  }));

  return (
    <PickListsClient
      pickLists={pickListsRes.data || []}
      warehouses={formattedWarehouses}
      pickers={pickersRes.data || []}
      pendingCount={pendingCount || 0}
    />
  );
}

