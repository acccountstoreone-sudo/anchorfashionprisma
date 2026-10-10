"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StockMovementActions } from "@/features/inventory/components/InventoryPageActions";
import { exportToCsv } from "@/lib/utils/export";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getReasonBadge = (reason: string) => {
  switch (reason?.toUpperCase()) {
    case "SALE":
      return <Badge variant="secondary">SALE</Badge>;
    case "RESTOCK":
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
          RESTOCK
        </Badge>
      );
    case "RETURN":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          RETURN
        </Badge>
      );
    case "DAMAGE":
      return <Badge variant="destructive">DAMAGE</Badge>;
    case "MANUAL_ADJUSTMENT":
    case "CYCLE_COUNT":
      return (
        <Badge variant="outline" className="text-slate-600">
          {reason?.replace(/_/g, " ")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{reason || "—"}</Badge>;
  }
};

interface StockMovementClientProps {
  movements: any[];
  allWarehouses?: any[];
  allVariants?: any[];
}

export function StockMovementClient({
  movements,
  allWarehouses = [],
  allVariants = [],
}: StockMovementClientProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const variantSku = m.variants?.sku || m.variant?.sku || "";
      const variantName = m.variants?.name || m.variant?.name || "";
      const warehouseName = m.warehouses?.name || m.warehouse?.name || "";
      const reason = m.reason || m.reason_code || "";
      const notes = m.notes || "";

      const matchesSearch =
        !search ||
        variantSku.toLowerCase().includes(search.toLowerCase()) ||
        variantName.toLowerCase().includes(search.toLowerCase()) ||
        warehouseName.toLowerCase().includes(search.toLowerCase()) ||
        reason.toLowerCase().includes(search.toLowerCase()) ||
        notes.toLowerCase().includes(search.toLowerCase()) ||
        m.variant_id?.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "ALL" ||
        m.movement_type === typeFilter ||
        (typeFilter === "IN" && ["RECEIVE", "RESTOCK", "IN"].includes(m.movement_type)) ||
        (typeFilter === "OUT" && ["DAMAGE", "OUT", "SALE"].includes(m.movement_type)) ||
        (typeFilter === "ADJUST" && ["ADJUST", "ADJUSTMENT"].includes(m.movement_type));

      return matchesSearch && matchesType;
    });
  }, [movements, search, typeFilter]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No movement data to export.");
      return;
    }
    const exportData = filtered.map((m) => ({
      SKU: m.variants?.sku || m.variant?.sku || m.variant_id || "N/A",
      Product: m.variants?.name || m.variant?.name || "N/A",
      Warehouse: m.warehouses?.name || m.warehouse?.name || "N/A",
      Type: m.movement_type,
      "Quantity Change": m.quantity_change ?? m.quantity ?? 0,
      Reason: m.reason || m.reason_code || "—",
      Notes: m.notes || "—",
      Date: new Date(m.created_at).toISOString().split("T")[0],
    }));

    exportToCsv(`stock_movements_${new Date().toISOString().split("T")[0]}.csv`, exportData);
    toast.success("Stock movements exported successfully");
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 pt-6 max-w-full overflow-hidden">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stock Movement</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time audit trail of all inventory receipts, deductions, transfers, and cycle counts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <StockMovementActions allWarehouses={allWarehouses} allVariants={allVariants} />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU, name, warehouse, notes..."
            className="pl-9 bg-card text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "ALL")}>
          <SelectTrigger className="w-44 bg-card text-sm">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Movement Types</SelectItem>
            <SelectItem value="IN">IN (Receive / Restock)</SelectItem>
            <SelectItem value="OUT">OUT (Damage / Deduct)</SelectItem>
            <SelectItem value="TRANSFER">Transfer</SelectItem>
            <SelectItem value="ADJUST">Adjustment</SelectItem>
            <SelectItem value="RETURN">Return</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card text-card-foreground overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Product / SKU</TableHead>
              <TableHead className="min-w-[120px]">Warehouse</TableHead>
              <TableHead className="min-w-[100px]">Type</TableHead>
              <TableHead className="text-right min-w-[90px]">Qty Change</TableHead>
              <TableHead className="min-w-[140px]">Reason & Notes</TableHead>
              <TableHead className="min-w-[110px] text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <p className="text-sm">
                      {search || typeFilter !== "ALL"
                        ? "No movements match your filters."
                        : "No stock movements recorded yet."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((movement: any) => {
                const qtyChange = movement.quantity_change ?? movement.quantity ?? 0;
                const isPositive = qtyChange > 0;
                const sku = movement.variants?.sku || movement.variant?.sku || movement.variant_id;
                const productName = movement.variants?.name || movement.variant?.name;
                const warehouseName = movement.warehouses?.name || movement.warehouse?.name || movement.warehouse_id;

                return (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold">{sku}</span>
                        {productName && (
                          <span className="text-muted-foreground text-[11px] truncate max-w-[180px]">
                            {productName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="truncate max-w-[140px] block">{warehouseName || "Default Warehouse"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {movement.movement_type || "ADJUST"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs">
                      <span
                        className={
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {isPositive ? "+" : ""}
                        {qtyChange}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        <div>{getReasonBadge(movement.reason || movement.reason_code)}</div>
                        {movement.notes && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {movement.notes}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(movement.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
