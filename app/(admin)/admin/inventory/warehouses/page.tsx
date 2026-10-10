import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { getAllWarehouses, getOverallWarehouseStatsAction } from "@/actions/warehouse.actions";
import { WarehouseListClient } from "@/features/warehouse/components/WarehouseListClient";
import {
  Building2,
  Package,
  Layers,
  AlertTriangle,
  Boxes,
  TrendingUp,
  Coins,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Warehouse Management | Anchor Fashion ERP",
  description: "Enterprise physical storage management, zone/rack/shelf hierarchy, and stock movements.",
};

export default async function WarehousesPage() {
  const [warehousesRes, statsRes] = await Promise.all([
    getAllWarehouses(),
    getOverallWarehouseStatsAction(),
  ]);

  const warehouses = warehousesRes.data || [];
  const stats = statsRes.data || {
    total_warehouses: warehouses.length,
    active_warehouses: warehouses.filter((w) => w.is_active).length,
    total_products: 0,
    total_stock: 0,
    total_valuation: 0,
    low_stock_alerts: 0,
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Warehouse Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Oversee physical storage nodes, zone-level hierarchies, capacity utilization, and inter-facility stock movements.
          </p>
        </div>
      </div>

      {/* Enterprise Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Warehouses</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">{stats.total_warehouses}</h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active Hubs</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {stats.active_warehouses}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stored SKUs</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                {stats.total_products.toLocaleString()}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Stock Units</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                {stats.total_stock.toLocaleString()}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Valuation</p>
              <h3 className="text-lg sm:text-xl font-bold mt-1 text-foreground truncate">
                ৳{stats.total_valuation ? stats.total_valuation.toLocaleString() : "0"}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Low Stock Alerts</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                {stats.low_stock_alerts}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Client */}
      <WarehouseListClient initialWarehouses={warehouses} allWarehousesForTransfer={warehouses} />
    </div>
  );
}
