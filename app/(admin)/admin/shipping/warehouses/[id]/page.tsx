import { Metadata } from "next";
import { getWarehouseByIdAction, getZonesByWarehouseAction, getBinsByZoneAction } from "@/app/actions/manager/warehouse.actions";
import { WarehouseManager } from "@/features/warehouse/components/warehouse-manager";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manage Warehouse | Admin Dashboard",
};

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const [warehouseRes, zonesRes] = await Promise.all([
    getWarehouseByIdAction(id),
    getZonesByWarehouseAction(id)
  ]);

  if (!warehouseRes.success || !warehouseRes.data) {
    notFound();
  }

  const warehouse = warehouseRes.data;
  const zones = zonesRes.data || [];
  
  // Fetch bins for all zones
  let allBins: any[] = [];
  if (zones.length > 0) {
    const binsPromises = zones.map((z: any) => getBinsByZoneAction(z.id));
    const binsResults = await Promise.all(binsPromises);
    allBins = binsResults.flatMap(r => r.success ? r.data : []);
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/shipping/warehouses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{warehouse.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Manage warehouse settings, zones, and bins.
          </p>
        </div>
      </div>

      <WarehouseManager warehouse={warehouse} zones={zones} bins={allBins} />
    </div>
  );
}
