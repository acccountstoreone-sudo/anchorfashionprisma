import { Metadata } from "next";
import { getAllWarehouses } from "@/actions/warehouse.actions";
import { OperationsWarehouseClient } from "@/features/warehouse/components/OperationsWarehouseClient";

export const metadata: Metadata = {
  title: "Warehouse Management | Anchor Fashion Enterprise",
  description: "Enterprise Warehouse and Location Management",
};

export default async function WarehouseDashboard() {
  const { data: realWarehouses } = await getAllWarehouses();
  const warehouses = realWarehouses || [];

  return <OperationsWarehouseClient warehouses={warehouses} />;
}
