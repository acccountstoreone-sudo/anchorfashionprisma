import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getWarehouseById,
  getWarehouseZones,
  getWarehouseInventoryAction,
  getAllWarehouses,
} from "@/actions/warehouse.actions";
import { WarehouseInventoryClient } from "@/features/warehouse/components/WarehouseInventoryClient";

export const metadata: Metadata = {
  title: "Warehouse Inventory | Anchor Fashion ERP",
  description: "Detailed inventory stock levels, rack/shelf storage locations, and valuations.",
};

export default async function WarehouseInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [warehouseRes, zonesRes, inventoryRes, allWarehousesRes] = await Promise.all([
    getWarehouseById(id),
    getWarehouseZones(id),
    getWarehouseInventoryAction(id, { limit: 200 }),
    getAllWarehouses(),
  ]);

  const warehouse = warehouseRes.data;
  if (!warehouse) {
    notFound();
  }

  const zones = zonesRes.data || [];
  const inventoryItems = inventoryRes.data?.data || [];
  const allWarehouses = allWarehousesRes.data || [];

  return (
    <div className="space-y-6 max-w-full">
      <WarehouseInventoryClient
        warehouse={warehouse}
        initialItems={inventoryItems}
        zones={zones}
        allWarehouses={allWarehouses}
      />
    </div>
  );
}
