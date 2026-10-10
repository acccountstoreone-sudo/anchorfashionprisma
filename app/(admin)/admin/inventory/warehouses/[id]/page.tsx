import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  getWarehouseById,
  getWarehouseZones,
  getZoneBins,
  getWarehouseInventoryAction,
  getDetailedMovementsAction,
  getAllWarehouses,
} from "@/actions/warehouse.actions";
import { WarehouseDetailClient } from "@/features/warehouse/components/WarehouseDetailClient";

export const metadata: Metadata = {
  title: "Warehouse Dashboard | Anchor Fashion ERP",
  description: "Detailed facility dashboard, storage hierarchy, stock operations, and inventory ledger.",
};

export default async function WarehouseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [warehouseRes, zonesRes, inventoryRes, movementsRes, allWarehousesRes] = await Promise.all([
    getWarehouseById(id),
    getWarehouseZones(id),
    getWarehouseInventoryAction(id, { limit: 50 }),
    getDetailedMovementsAction({ warehouseId: id, limit: 30 }),
    getAllWarehouses(),
  ]);

  const warehouse = warehouseRes.data;
  if (!warehouse) {
    notFound();
  }

  const rawZones = zonesRes.data || [];

  // Enrich zones with their bins
  const zonesWithBins = await Promise.all(
    rawZones.map(async (zone) => {
      try {
        const binsRes = await getZoneBins(zone.id);
        return {
          ...zone,
          bins: binsRes.data || [],
        };
      } catch {
        return { ...zone, bins: [] };
      }
    })
  );

  const inventoryItems = inventoryRes.data?.data || [];
  const movements = movementsRes.data?.data || [];
  const allWarehouses = allWarehousesRes.data || [];

  return (
    <div className="space-y-6 max-w-full">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
          <Link href="/admin/inventory/warehouses">
            <ArrowLeft className="h-4 w-4" /> Back to Warehouses
          </Link>
        </Button>
      </div>

      {/* Main Client Dashboard */}
      <WarehouseDetailClient
        warehouse={warehouse}
        zonesWithBins={zonesWithBins}
        inventoryItems={inventoryItems}
        movements={movements}
        allWarehouses={allWarehouses}
      />
    </div>
  );
}
