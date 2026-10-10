"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Package,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Coins,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Layers,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Scale,
  Settings,
  History,
  FolderTree,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Warehouse, WarehouseZone } from "@/types/inventory.types";
import { ManageWarehouseSettingsButton } from "./WarehousePageActions";
import { WarehouseHierarchyManager } from "./WarehouseHierarchyManager";
import { StockInDialog } from "./StockInDialog";
import { StockOutDialog } from "./StockOutDialog";
import { StockTransferDialog } from "./StockTransferDialog";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";

interface WarehouseDetailClientProps {
  warehouse: Warehouse;
  zonesWithBins: (WarehouseZone & { bins?: any[] })[];
  inventoryItems: any[];
  movements: any[];
  allWarehouses: Warehouse[];
}

export function WarehouseDetailClient({
  warehouse,
  zonesWithBins,
  inventoryItems,
  movements,
  allWarehouses,
}: WarehouseDetailClientProps) {
  const router = useRouter();

  // Dialog states
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<any>(null);

  const formatTypeLabel = (w: Warehouse) => {
    if (w.operational_type) {
      return w.operational_type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return w.type === "RETAIL_STORE" ? "Retail Store / Outlet" : "Main Warehouse";
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards (8 Cards as requested in prompt) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Products */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Products</p>
            <div className="text-xl font-bold mt-1 text-foreground">
              {warehouse.total_products !== undefined ? warehouse.total_products : inventoryItems.length}
            </div>
            <span className="text-[10px] text-muted-foreground">Distinct SKUs</span>
          </CardContent>
        </Card>

        {/* Total Stock */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Stock</p>
            <div className="text-xl font-bold mt-1 text-foreground">
              {warehouse.total_stock !== undefined ? warehouse.total_stock.toLocaleString() : "0"}
            </div>
            <span className="text-[10px] text-muted-foreground">All Units</span>
          </CardContent>
        </Card>

        {/* Available Stock */}
        <Card className="bg-card shadow-xs border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Available</p>
            <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {warehouse.available_stock !== undefined ? warehouse.available_stock.toLocaleString() : "0"}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Ready to Ship</span>
          </CardContent>
        </Card>

        {/* Reserved Stock */}
        <Card className="bg-card shadow-xs border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Reserved</p>
            <div className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
              {warehouse.reserved_stock !== undefined ? warehouse.reserved_stock.toLocaleString() : "0"}
            </div>
            <span className="text-[10px] text-blue-700 dark:text-blue-400">Orders in Queue</span>
          </CardContent>
        </Card>

        {/* Damaged Stock */}
        <Card className="bg-card shadow-xs border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Damaged</p>
            <div className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">
              {warehouse.damaged_stock !== undefined ? warehouse.damaged_stock.toLocaleString() : "0"}
            </div>
            <span className="text-[10px] text-rose-700 dark:text-rose-400">Quarantined</span>
          </CardContent>
        </Card>

        {/* Low Stock Products */}
        <Card className="bg-card shadow-xs border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Low Stock</p>
            <div className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {warehouse.low_stock_items || 0}
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">Need Reorder</span>
          </CardContent>
        </Card>

        {/* Out of Stock Products */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Out of Stock</p>
            <div className="text-xl font-bold mt-1 text-foreground">
              {warehouse.out_of_stock_items || 0}
            </div>
            <span className="text-[10px] text-muted-foreground">Zero Units</span>
          </CardContent>
        </Card>

        {/* Total Stock Value */}
        <Card className="bg-card shadow-xs border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">Valuation</p>
            <div className="text-lg sm:text-base font-bold mt-1 text-violet-600 dark:text-violet-400 truncate">
              ৳{warehouse.total_stock_value ? warehouse.total_stock_value.toLocaleString() : "0"}
            </div>
            <span className="text-[10px] text-violet-700 dark:text-violet-400">Total Asset Value</span>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Information & Operations Action Toolbar */}
      <Card className="bg-card shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Warehouse Info Block */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{warehouse.name}</h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {warehouse.code || warehouse.warehouse_code || "—"}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {formatTypeLabel(warehouse)}
                </Badge>
                <Badge
                  variant={warehouse.is_active ? "default" : "secondary"}
                  className={warehouse.is_active ? "bg-emerald-600 text-white text-xs" : "text-xs"}
                >
                  {warehouse.is_active ? "Active" : "Inactive"}
                </Badge>
                {warehouse.is_default && (
                  <Badge variant="outline" className="border-primary text-primary text-xs">
                    Primary Default Hub
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {[warehouse.address, warehouse.city, warehouse.country].filter(Boolean).join(", ") ||
                      "Location not set"}
                  </span>
                </div>

                {warehouse.manager_name && (
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>Manager: {warehouse.manager_name}</span>
                  </div>
                )}

                {warehouse.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{warehouse.phone}</span>
                  </div>
                )}

                {warehouse.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span>{warehouse.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Created: {new Date(warehouse.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Policy Badges */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                <span className="text-muted-foreground">Policies:</span>
                <Badge variant="outline" className="text-[10px] font-normal py-0">
                  Negative Stock: {warehouse.allow_negative_stock ? "Allowed" : "Prohibited"}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-normal py-0">
                  Batch Tracking: {warehouse.enable_batch_tracking ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-normal py-0">
                  Serial Tracking: {warehouse.enable_serial_tracking ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            {/* Quick Operations Button Toolbar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button size="sm" onClick={() => setStockInOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <PackagePlus className="h-4 w-4" /> Stock In
              </Button>

              <Button size="sm" variant="destructive" onClick={() => setStockOutOpen(true)} className="gap-1.5">
                <PackageMinus className="h-4 w-4" /> Stock Out
              </Button>

              <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)} className="gap-1.5">
                <ArrowRightLeft className="h-4 w-4" /> Transfer
              </Button>

              <Button size="sm" variant="outline" onClick={() => { setSelectedProductForAdjust(null); setAdjustmentOpen(true); }} className="gap-1.5">
                <Scale className="h-4 w-4" /> Adjust Count
              </Button>

              <ManageWarehouseSettingsButton warehouse={warehouse} size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Tabs */}
      <Tabs defaultValue="hierarchy" className="w-full">
        <TabsList className="grid grid-cols-3 w-full sm:w-[450px]">
          <TabsTrigger value="hierarchy" className="gap-1.5 text-xs sm:text-sm">
            <FolderTree className="h-4 w-4" /> Zones & Shelves
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm">
            <Package className="h-4 w-4" /> Inventory ({inventoryItems.length})
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-1.5 text-xs sm:text-sm">
            <History className="h-4 w-4" /> Movements
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: STORAGE HIERARCHY (ZONES, RACKS & SHELVES/BINS) ───────────── */}
        <TabsContent value="hierarchy" className="pt-4">
          <WarehouseHierarchyManager warehouseId={warehouse.id} zones={zonesWithBins} />
        </TabsContent>

        {/* ─── TAB 2: INVENTORY TABLE ───────────────────────────────────────────── */}
        <TabsContent value="inventory" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Stored Inventory Ledger</h3>
              <p className="text-xs text-muted-foreground">All products physically stored within this warehouse.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/inventory/warehouses/${warehouse.id}/inventory`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Inventory View
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">SKU</TableHead>
                  <TableHead className="text-xs font-semibold">Product Name</TableHead>
                  <TableHead className="text-xs font-semibold">Location</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Available</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Reserved</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Damaged</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Total Stock</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Unit Cost</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Stock Value</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-bold">{item.sku}</TableCell>
                      <TableCell className="text-xs font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span>{item.zone_name}</span>
                          {item.bin_code !== "—" && (
                            <span className="text-foreground font-semibold">/ {item.bin_code}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {item.quantity_available.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-blue-600 dark:text-blue-400">
                        {item.quantity_reserved}
                      </TableCell>
                      <TableCell className="text-right text-xs text-rose-600 dark:text-rose-400">
                        {item.quantity_damaged}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        {item.total_quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        ৳{item.unit_cost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        ৳{item.stock_value.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.stock_status === "IN_STOCK"
                              ? "default"
                              : item.stock_status === "LOW_STOCK"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.stock_status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedProductForAdjust(item);
                            setAdjustmentOpen(true);
                          }}
                        >
                          <Scale className="h-3.5 w-3.5 mr-1" /> Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-muted-foreground text-xs">
                      No inventory currently stored in this warehouse. Use Stock In or Transfer to receive products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── TAB 3: STOCK MOVEMENTS ───────────────────────────────────────────── */}
        <TabsContent value="movements" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Facility Stock Movement Log</h3>
              <p className="text-xs text-muted-foreground">Audited trace of all receipts, dispatches, adjustments, and transfers.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/inventory/stock-movements?warehouse_id=${warehouse.id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Audit Log
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                  <TableHead className="text-xs font-semibold">Product</TableHead>
                  <TableHead className="text-xs font-semibold">SKU</TableHead>
                  <TableHead className="text-xs font-semibold">Movement Type</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Quantity</TableHead>
                  <TableHead className="text-xs font-semibold">Location / Bin</TableHead>
                  <TableHead className="text-xs font-semibold">Reference</TableHead>
                  <TableHead className="text-xs font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length > 0 ? (
                  movements.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/30 text-xs">
                      <TableCell className="text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{m.product_name}</TableCell>
                      <TableCell className="font-mono">{m.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                          {m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          m.quantity > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {m.bin_code || m.zone_name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {m.reference_id}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate" title={m.notes}>
                        {m.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                      No stock movements recorded for this facility yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <StockInDialog
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        warehouseId={warehouse.id}
        warehouseName={warehouse.name}
        zones={zonesWithBins}
      />

      <StockOutDialog
        open={stockOutOpen}
        onOpenChange={setStockOutOpen}
        warehouseId={warehouse.id}
        warehouseName={warehouse.name}
        allowNegativeStock={warehouse.allow_negative_stock}
      />

      <StockTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        sourceWarehouse={warehouse}
        allWarehouses={allWarehouses}
      />

      <StockAdjustmentDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        warehouseId={warehouse.id}
        warehouseName={warehouse.name}
        preselectedProduct={selectedProductForAdjust}
      />
    </div>
  );
}
