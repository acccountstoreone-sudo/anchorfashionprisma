import { Metadata } from "next";
import { FulfillmentClient } from "@/features/inventory/components/FulfillmentClient";
import { getPickListsAction, getPickersAction } from "@/actions/admin/fulfillment.actions";
import { getWarehouses } from "@/app/actions/admin/procurement.actions";

export const metadata: Metadata = {
  title: "Warehouse Fulfillment | Anchor Fashion",
  description: "Manage wave batches, pick lists, packing, and dispatch operations.",
};

export const dynamic = "force-dynamic";

export default async function FulfillmentPage() {
  const [
    pickListsRes,
    pickersRes,
    whRes,
  ] = await Promise.all([
    getPickListsAction(),
    getPickersAction(),
    getWarehouses(),
  ]);

  return (
    <FulfillmentClient
      initialPickLists={pickListsRes.success && pickListsRes.data ? pickListsRes.data : []}
      pickers={pickersRes.success && pickersRes.data ? pickersRes.data : []}
      allWarehouses={whRes.success && whRes.data ? whRes.data : []}
    />
  );
}
