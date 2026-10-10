"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, Filter, SlidersHorizontal, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockControlActions } from "@/features/inventory/components/InventoryPageActions";
import { adjustStock } from "@/actions/inventory.actions";
import { exportToCsv } from "@/lib/utils/export";
import { toast } from "sonner";

interface StockControlClientProps {
  inventory: any[];
  allWarehouses: any[];
  allVariants: any[];
  allSuppliers?: any[];
}

export function StockControlClient({
  inventory = [],
  allWarehouses = [],
  allVariants = [],
  allSuppliers = [],
}: StockControlClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");

  // Adjust stock state
  const [adjustItem, setAdjustItem] = useState<any | null>(null);
  const [adjustAvailable, setAdjustAvailable] = useState<number>(0);
  const [adjustReserved, setAdjustReserved] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("CYCLE_COUNT");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const sku = item.variants?.sku?.toLowerCase() || "";
      const name = (item.variants?.product?.name || item.variants?.name || "").toLowerCase();
      const warehouse = item.warehouses?.name?.toLowerCase() || "";
      const query = search.toLowerCase();

      const matchesSearch = !search || sku.includes(query) || name.includes(query) || warehouse.includes(query);

      const matchesWarehouse = warehouseFilter === "ALL" || item.warehouse_id === warehouseFilter;

      let matchesStatus = true;
      if (statusFilter === "OUT_OF_STOCK") {
        matchesStatus = item.quantity_available === 0;
      } else if (statusFilter === "LOW_STOCK") {
        matchesStatus = item.quantity_available > 0 && item.quantity_available <= (item.reorder_point || 5);
      } else if (statusFilter === "IN_STOCK") {
        matchesStatus = item.quantity_available > (item.reorder_point || 5);
      }

      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [inventory, search, statusFilter, warehouseFilter]);

  const handleOpenAdjust = (item: any) => {
    setAdjustItem(item);
    setAdjustAvailable(item.quantity_available || 0);
    setAdjustReserved(item.quantity_reserved || 0);
    setAdjustReason("CYCLE_COUNT");
    setAdjustNotes("");
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    setAdjustLoading(true);
    const res = await adjustStock(
      adjustItem.id,
      Number(adjustAvailable),
      Number(adjustReserved),
      adjustReason
    );
    setAdjustLoading(false);

    if (res.error) {
      toast.error("Failed to adjust stock", { description: res.error });
    } else {
      toast.success("Stock level updated successfully");
      setAdjustItem(null);
      router.refresh();
    }
  };

  const handleExportFiltered = () => {
    if (filteredInventory.length === 0) {
      toast.error("No inventory data to export.");
      return;
    }
    const exportData = filteredInventory.map((item) => ({
      SKU: item.variants?.sku || "N/A",
      "Product Name": item.variants?.name || "N/A",
      Warehouse: item.warehouses?.name || "N/A",
      "Available Qty": item.quantity_available,
      "Reserved Qty": item.quantity_reserved,
      "Damaged Qty": item.quantity_damaged,
      "Returned Qty": item.quantity_returned,
      "Incoming Qty": item.quantity_incoming,
      "Reorder Point": item.reorder_point || 0,
      Status:
        item.quantity_available === 0
          ? "Out of Stock"
          : item.quantity_available <= (item.reorder_point || 5)
          ? "Low Stock"
          : "In Stock",
    }));

    exportToCsv(
      `stock_inventory_${new Date().toISOString().split("T")[0]}.csv`,
      exportData
    );
    toast.success("Stock inventory exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header and Page Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Control</h2>
          <p className="text-muted-foreground">
            Monitor real-time inventory levels, reorder alerts, and manual adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportFiltered}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <StockControlActions
            inventory={inventory}
            allWarehouses={allWarehouses}
            allVariants={allVariants}
            allSuppliers={allSuppliers}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU, product name, warehouse..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={warehouseFilter} onValueChange={(val) => setWarehouseFilter(val || "ALL")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Warehouses</SelectItem>
              {allWarehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || statusFilter !== "ALL" || warehouseFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setWarehouseFilter("ALL");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU & Status</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Damaged</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Incoming</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{item.variants?.sku || "N/A"}</span>
                    {item.quantity_available === 0 ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Out of Stock
                      </Badge>
                    ) : item.quantity_available <= (item.reorder_point || 5) ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] px-1.5 py-0">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
                        In Stock
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {item.variants?.product?.name || item.variants?.name || "Standard Product"}
                  </div>
                  {item.variants?.attributes && typeof item.variants.attributes === "object" && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {Object.entries(item.variants.attributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" / ")}
                    </div>
                  )}
                </TableCell>
                <TableCell>{item.warehouses?.name || "N/A"}</TableCell>
                <TableCell className="text-right font-bold">
                  <span
                    className={
                      item.quantity_available === 0
                        ? "text-destructive"
                        : item.quantity_available <= (item.reorder_point || 5)
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {item.quantity_available}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.quantity_reserved}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.quantity_damaged}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.quantity_returned}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.quantity_incoming}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAdjust(item)}
                    className="hover:bg-muted"
                  >
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    Adjust
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredInventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p>No inventory records found matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(open) => !open && setAdjustItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
            <DialogDescription>
              Update available and reserved counts for this product variant.
            </DialogDescription>
          </DialogHeader>

          {adjustItem && (
            <form onSubmit={handleSaveAdjust} className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-semibold">{adjustItem.variants?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono">{adjustItem.variants?.sku || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouse:</span>
                  <span>{adjustItem.warehouses?.name || "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="available_qty">Available Quantity</Label>
                  <Input
                    id="available_qty"
                    type="number"
                    min="0"
                    required
                    value={adjustAvailable}
                    onChange={(e) => setAdjustAvailable(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserved_qty">Reserved Quantity</Label>
                  <Input
                    id="reserved_qty"
                    type="number"
                    min="0"
                    required
                    value={adjustReserved}
                    onChange={(e) => setAdjustReserved(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Adjustment Reason</Label>
                <Select value={adjustReason} onValueChange={(val) => setAdjustReason(val || "CYCLE_COUNT")}>
                  <SelectTrigger id="reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CYCLE_COUNT">Cycle Count / Audit Correction</SelectItem>
                    <SelectItem value="DAMAGE">Damaged / Broken Goods</SelectItem>
                    <SelectItem value="SHRINKAGE">Theft / Unaccounted Shrinkage</SelectItem>
                    <SelectItem value="RESTOCK_CORRECTION">Restock Miscount Correction</SelectItem>
                    <SelectItem value="CUSTOMER_RETURN">Customer Return Restock</SelectItem>
                    <SelectItem value="OTHER">Other Manual Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Reason for adjustment, inspector initials, etc."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustItem(null)}
                  disabled={adjustLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={adjustLoading}>
                  {adjustLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Adjustment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
