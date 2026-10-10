"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  ArrowRightLeft,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Warehouse } from "@/types/inventory.types";

interface StockMovementsClientProps {
  initialMovements: any[];
  allWarehouses: Warehouse[];
  initialWarehouseId?: string;
}

export function StockMovementsClient({
  initialMovements,
  allWarehouses,
  initialWarehouseId = "all",
}: StockMovementsClientProps) {
  const [movements, setMovements] = useState<any[]>(initialMovements);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter
  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchProd = (m.product_name || "").toLowerCase().includes(q);
        const matchSku = (m.sku || "").toLowerCase().includes(q);
        const matchWh = (m.warehouse_name || "").toLowerCase().includes(q);
        const matchRef = (m.reference_id || "").toLowerCase().includes(q);
        const matchBin = (m.bin_code || "").toLowerCase().includes(q);
        const matchNotes = (m.notes || "").toLowerCase().includes(q);
        if (!matchProd && !matchSku && !matchWh && !matchRef && !matchBin && !matchNotes) return false;
      }

      if (typeFilter !== "all") {
        if (m.movement_type.toLowerCase() !== typeFilter.toLowerCase()) return false;
      }

      if (warehouseFilter !== "all") {
        const wh = allWarehouses.find((w) => w.id === warehouseFilter);
        if (wh && m.warehouse_name !== wh.name && m.to_warehouse_name !== wh.name) return false;
      }

      return true;
    });
  }, [movements, search, typeFilter, warehouseFilter, allWarehouses]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleExport = () => {
    const headers = [
      "Movement ID",
      "Date",
      "Product",
      "SKU",
      "Warehouse",
      "To Warehouse",
      "Zone",
      "Shelf/Bin",
      "Movement Type",
      "Quantity",
      "Reference",
      "User",
      "Notes",
    ];

    const rows = filtered.map((m) => [
      `"${m.id}"`,
      `"${new Date(m.created_at).toLocaleString()}"`,
      `"${(m.product_name || "").replace(/"/g, '""')}"`,
      `"${m.sku || ""}"`,
      `"${m.warehouse_name || ""}"`,
      `"${m.to_warehouse_name || ""}"`,
      `"${m.zone_name || ""}"`,
      `"${m.bin_code || ""}"`,
      `"${m.movement_type}"`,
      m.quantity,
      `"${m.reference_id || ""}"`,
      `"${m.user_id || "System"}"`,
      `"${(m.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `stock_movements_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Movements log exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Stock Movement History & Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Complete, immutable audit trail of every stock in, dispatch, transfer, and physical count adjustment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 border rounded-lg p-3.5 bg-card shadow-xs">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search movement ID, SKU, product, warehouse, reference, or notes..."
            className="pl-9 text-xs sm:text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val || "all");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[150px] text-xs">
            <SelectValue placeholder="Movement Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Stock In">Stock In</SelectItem>
            <SelectItem value="Stock Out">Stock Out</SelectItem>
            <SelectItem value="Transfer">Transfer</SelectItem>
            <SelectItem value="Adjustment">Adjustment</SelectItem>
            <SelectItem value="Return">Return</SelectItem>
            <SelectItem value="Damage">Damage</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={warehouseFilter}
          onValueChange={(val) => {
            setWarehouseFilter(val || "all");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px] text-xs">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Facilities</SelectItem>
            {allWarehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name} {w.code ? `(${w.code})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Movements Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs">
              <TableHead className="font-semibold">Movement ID</TableHead>
              <TableHead className="font-semibold">Date & Time</TableHead>
              <TableHead className="font-semibold">Product Name</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Warehouse Location</TableHead>
              <TableHead className="font-semibold">Shelf / Bin</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="text-right font-semibold">Quantity</TableHead>
              <TableHead className="font-semibold">Reference</TableHead>
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30 text-xs">
                  <TableCell className="font-mono text-[11px] text-muted-foreground truncate max-w-[100px]" title={m.id}>
                    {m.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-foreground max-w-[180px] truncate" title={m.product_name}>
                    {m.product_name}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-foreground">{m.sku}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{m.warehouse_name}</span>
                      {m.to_warehouse_name && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ArrowRightLeft className="h-2.5 w-2.5" /> {m.to_warehouse_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {m.bin_code !== "—" ? m.bin_code : m.zone_name !== "—" ? m.zone_name : "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold uppercase ${
                        m.movement_type === "Stock In"
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : m.movement_type === "Stock Out"
                          ? "border-rose-500 text-rose-600 dark:text-rose-400"
                          : m.movement_type === "Transfer"
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-amber-500 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {m.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold font-mono ${
                      m.quantity > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {m.reference_id || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[90px]">
                    {m.user_id || "System"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate" title={m.notes}>
                    {m.notes || "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground text-xs">
                  No stock movements match the specified filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
          <div>
            Showing <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> to{" "}
            <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> of{" "}
            <strong>{filtered.length}</strong> events
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
