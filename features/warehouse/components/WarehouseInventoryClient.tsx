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
  Package,
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Scale,
  ArrowLeft,
  Coins,
  Boxes,
  MapPin,
  PackagePlus,
  PackageMinus,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Warehouse, WarehouseZone } from "@/types/inventory.types";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { StockInDialog } from "./StockInDialog";
import { StockOutDialog } from "./StockOutDialog";
import { StockTransferDialog } from "./StockTransferDialog";

interface WarehouseInventoryClientProps {
  warehouse: Warehouse;
  initialItems: any[];
  zones: WarehouseZone[];
  allWarehouses: Warehouse[];
}

export function WarehouseInventoryClient({
  warehouse,
  initialItems,
  zones,
  allWarehouses,
}: WarehouseInventoryClientProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"sku" | "name" | "available" | "value">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Dialogs
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Filters
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesName = item.product_name.toLowerCase().includes(q);
        const matchesCat = item.category_name.toLowerCase().includes(q);
        const matchesBin = (item.bin_code || "").toLowerCase().includes(q);
        if (!matchesSku && !matchesName && !matchesCat && !matchesBin) return false;
      }

      if (statusFilter !== "all" && item.stock_status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (zoneFilter !== "all" && item.zone_name.toLowerCase() !== zoneFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [items, search, statusFilter, zoneFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "sku") cmp = a.sku.localeCompare(b.sku);
      else if (sortBy === "available") cmp = a.quantity_available - b.quantity_available;
      else if (sortBy === "value") cmp = a.stock_value - b.stock_value;
      else cmp = a.product_name.localeCompare(b.product_name);
      return sortOrder === "desc" ? -cmp : cmp;
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Aggregate stats
  const totalStockUnits = useMemo(() => filtered.reduce((acc, i) => acc + i.total_quantity, 0), [filtered]);
  const totalValuation = useMemo(() => filtered.reduce((acc, i) => acc + i.stock_value, 0), [filtered]);

  const handleExport = () => {
    const headers = [
      "SKU",
      "Product",
      "Category",
      "Zone",
      "Rack",
      "Shelf/Bin",
      "Available",
      "Reserved",
      "Damaged",
      "Total",
      "Unit Cost",
      "Stock Value",
      "Status",
    ];

    const rows = sorted.map((i) => [
      `"${i.sku}"`,
      `"${i.product_name.replace(/"/g, '""')}"`,
      `"${i.category_name}"`,
      `"${i.zone_name}"`,
      `"${i.rack_code}"`,
      `"${i.shelf_code}"`,
      i.quantity_available,
      i.quantity_reserved,
      i.quantity_damaged,
      i.total_quantity,
      i.unit_cost,
      i.stock_value,
      i.stock_status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `warehouse_${warehouse.code || warehouse.id}_inventory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/inventory/warehouses/${warehouse.id}`}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Warehouse
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Warehouse Inventory: {warehouse.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exact bin-level locations, available stock, unit valuations, and physical quantities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setStockInOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <PackagePlus className="h-4 w-4" /> Stock In
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setStockOutOpen(true)} className="gap-1.5">
            <PackageMinus className="h-4 w-4" /> Stock Out
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)} className="gap-1.5">
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Filtered SKUs</p>
            <div className="text-xl font-bold mt-1 text-foreground">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Stock Units</p>
            <div className="text-xl font-bold mt-1 text-foreground">{totalStockUnits.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Stock Valuation</p>
            <div className="text-xl font-bold mt-1 text-primary">৳{totalValuation.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Low / Out of Stock</p>
            <div className="text-xl font-bold mt-1 text-rose-600">
              {filtered.filter((i) => i.stock_status === "LOW_STOCK" || i.stock_status === "OUT_OF_STOCK").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 border rounded-lg p-3.5 bg-card shadow-xs">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU, product title, category, shelf/bin code..."
            className="pl-9 text-xs sm:text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val || "all");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[150px] text-xs">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="overstock">Overstock</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={zoneFilter}
          onValueChange={(val) => {
            setZoneFilter(val || "all");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px] text-xs">
            <SelectValue placeholder="Zone Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer text-xs font-semibold"
                onClick={() => {
                  if (sortBy === "sku") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("sku"); setSortOrder("asc"); }
                }}
              >
                <div className="flex items-center gap-1">
                  SKU
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-xs font-semibold"
                onClick={() => {
                  if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("name"); setSortOrder("asc"); }
                }}
              >
                <div className="flex items-center gap-1">
                  Product Name
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold">Category</TableHead>
              <TableHead className="text-xs font-semibold">Zone</TableHead>
              <TableHead className="text-xs font-semibold">Rack</TableHead>
              <TableHead className="text-xs font-semibold">Shelf / Bin</TableHead>
              <TableHead
                className="cursor-pointer text-right text-xs font-semibold"
                onClick={() => {
                  if (sortBy === "available") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("available"); setSortOrder("desc"); }
                }}
              >
                <div className="flex items-center justify-end gap-1">
                  Available
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-right text-xs font-semibold">Reserved</TableHead>
              <TableHead className="text-right text-xs font-semibold">Damaged</TableHead>
              <TableHead className="text-right text-xs font-semibold">Total Stock</TableHead>
              <TableHead className="text-right text-xs font-semibold">Unit Cost</TableHead>
              <TableHead
                className="cursor-pointer text-right text-xs font-semibold"
                onClick={() => {
                  if (sortBy === "value") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("value"); setSortOrder("desc"); }
                }}
              >
                <div className="flex items-center justify-end gap-1">
                  Stock Value
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold">Stock Status</TableHead>
              <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 text-xs">
                  <TableCell className="font-mono font-bold text-foreground">{item.sku}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {item.zone_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{item.rack_code}</TableCell>
                  <TableCell className="font-mono font-bold text-primary">{item.shelf_code}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {item.quantity_available.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-400">
                    {item.quantity_reserved}
                  </TableCell>
                  <TableCell className="text-right text-rose-600 dark:text-rose-400">
                    {item.quantity_damaged}
                  </TableCell>
                  <TableCell className="text-right font-bold">{item.total_quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ৳{item.unit_cost.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ৳{item.stock_value.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.stock_status === "IN_STOCK"
                          ? "default"
                          : item.stock_status === "LOW_STOCK"
                          ? "destructive"
                          : item.stock_status === "OVERSTOCK"
                          ? "secondary"
                          : "outline"
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
                        setSelectedProduct(item);
                        setAdjustOpen(true);
                      }}
                    >
                      <Scale className="h-3.5 w-3.5 mr-1" /> Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={14} className="py-8 text-center text-muted-foreground">
                  No inventory matching filters found in this warehouse.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
          <div>
            Showing <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> to{" "}
            <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> of{" "}
            <strong>{filtered.length}</strong> items
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

      {/* Dialogs */}
      <StockAdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        warehouseId={warehouse.id}
        warehouseName={warehouse.name}
        preselectedProduct={selectedProduct}
      />

      <StockInDialog
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        warehouseId={warehouse.id}
        warehouseName={warehouse.name}
        zones={zones}
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
    </div>
  );
}
