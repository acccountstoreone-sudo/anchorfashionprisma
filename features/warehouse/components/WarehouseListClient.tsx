"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Building2,
  Search,
  SlidersHorizontal,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Package,
  ArrowRightLeft,
  History,
  Power,
  Trash2,
  MapPin,
  User,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Warehouse } from "@/types/inventory.types";
import {
  AddWarehouseButton,
  ManageWarehouseSettingsButton,
} from "./WarehousePageActions";
import {
  deleteWarehouse,
  toggleWarehouseStatus,
} from "@/actions/warehouse.actions";
import { StockTransferDialog } from "./StockTransferDialog";

interface WarehouseListClientProps {
  initialWarehouses: Warehouse[];
  allWarehousesForTransfer?: Warehouse[];
}

export function WarehouseListClient({
  initialWarehouses,
  allWarehousesForTransfer = [],
}: WarehouseListClientProps) {
  const router = useRouter();

  // State
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "code" | "stock" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [selectedWarehouseForEdit, setSelectedWarehouseForEdit] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceWarehouse, setTransferSourceWarehouse] = useState<Warehouse | null>(null);

  // Filter & Sort computation
  const filteredWarehouses = useMemo(() => {
    return initialWarehouses.filter((wh) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = wh.name.toLowerCase().includes(q);
        const matchesCode = (wh.code || wh.warehouse_code || "").toLowerCase().includes(q);
        const matchesLoc = (wh.city || wh.address || "").toLowerCase().includes(q);
        const matchesManager = (wh.manager_name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesLoc && !matchesManager) return false;
      }

      // Status
      if (statusFilter === "active" && !wh.is_active) return false;
      if (statusFilter === "inactive" && wh.is_active) return false;
      if (statusFilter === "archived" && wh.status !== "ARCHIVED") return false;

      // Type
      if (typeFilter !== "all") {
        if (wh.operational_type !== typeFilter && wh.type !== typeFilter) return false;
      }

      // Location
      if (locationFilter.trim()) {
        const loc = locationFilter.toLowerCase();
        const matchesLoc = (wh.city || "").toLowerCase().includes(loc) ||
          (wh.state || "").toLowerCase().includes(loc) ||
          (wh.address || "").toLowerCase().includes(loc);
        if (!matchesLoc) return false;
      }

      return true;
    });
  }, [initialWarehouses, search, statusFilter, typeFilter, locationFilter]);

  const sortedWarehouses = useMemo(() => {
    const list = [...filteredWarehouses];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "code") {
        comparison = (a.code || a.warehouse_code || "").localeCompare(b.code || b.warehouse_code || "");
      } else if (sortBy === "stock") {
        comparison = (a.total_stock || 0) - (b.total_stock || 0);
      } else if (sortBy === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });
    return list;
  }, [filteredWarehouses, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedWarehouses.length / pageSize) || 1;
  const paginatedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedWarehouses.slice(start, start + pageSize);
  }, [sortedWarehouses, currentPage, pageSize]);

  // Status toggle handler
  const handleToggleStatus = async (wh: Warehouse) => {
    const targetStatus = !wh.is_active;
    const res = await toggleWarehouseStatus(wh.id, targetStatus);
    if (res.success) {
      toast.success(`Warehouse "${wh.name}" is now ${targetStatus ? "Active" : "Inactive"}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update warehouse status");
    }
  };

  // Delete / Archive handler
  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;
    setDeleteLoading(true);
    const res = await deleteWarehouse(warehouseToDelete.id);
    setDeleteLoading(false);
    setWarehouseToDelete(null);

    if (res.success) {
      if (res.action === "archived") {
        toast.warning(res.message);
      } else {
        toast.success(res.message || "Warehouse deleted.");
      }
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete warehouse");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Code",
      "Name",
      "Type",
      "City",
      "Address",
      "Manager",
      "Phone",
      "Total Products",
      "Total Stock",
      "Available Stock",
      "Reserved Stock",
      "Damaged Stock",
      "Low Stock Items",
      "Status",
      "Created At",
    ];

    const rows = sortedWarehouses.map((w) => [
      `"${w.code || w.warehouse_code || ""}"`,
      `"${w.name.replace(/"/g, '""')}"`,
      `"${w.operational_type || w.type || ""}"`,
      `"${w.city || ""}"`,
      `"${(w.address || "").replace(/"/g, '""')}"`,
      `"${w.manager_name || ""}"`,
      `"${w.phone || ""}"`,
      w.total_products || 0,
      w.total_stock || 0,
      w.available_stock || 0,
      w.reserved_stock || 0,
      w.damaged_stock || 0,
      w.low_stock_items || 0,
      w.is_active ? "Active" : "Inactive",
      new Date(w.created_at).toLocaleDateString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `warehouse_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Warehouse list exported to CSV");
  };

  const formatTypeLabel = (w: Warehouse) => {
    if (w.operational_type) {
      return w.operational_type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return w.type === "RETAIL_STORE" ? "Store / Retail" : "Main Warehouse";
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, location, manager..."
              className="pl-9 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Warehouse Type Filter */}
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val || "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] text-xs sm:text-sm">
              <SelectValue placeholder="Warehouse Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="MAIN_WAREHOUSE">Main Warehouse</SelectItem>
              <SelectItem value="DISTRIBUTION_CENTER">Distribution Center</SelectItem>
              <SelectItem value="STORE">Store / Outlet</SelectItem>
              <SelectItem value="FACTORY">Factory</SelectItem>
              <SelectItem value="TRANSIT_WAREHOUSE">Transit</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Export & Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 flex-1 sm:flex-none">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <AddWarehouseButton />
          </div>
        </div>
      </div>

      {/* Warehouses Data Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer font-semibold text-xs"
                onClick={() => {
                  if (sortBy === "code") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("code"); setSortOrder("asc"); }
                }}
              >
                <div className="flex items-center gap-1">
                  Code
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-semibold text-xs"
                onClick={() => {
                  if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("name"); setSortOrder("asc"); }
                }}
              >
                <div className="flex items-center gap-1">
                  Warehouse Name
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold">Type</TableHead>
              <TableHead className="text-xs font-semibold">Location</TableHead>
              <TableHead className="text-xs font-semibold">Manager</TableHead>
              <TableHead className="text-right text-xs font-semibold">Products</TableHead>
              <TableHead
                className="cursor-pointer text-right text-xs font-semibold"
                onClick={() => {
                  if (sortBy === "stock") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else { setSortBy("stock"); setSortOrder("desc"); }
                }}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Stock
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">Low Stock</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWarehouses.length > 0 ? (
              paginatedWarehouses.map((wh) => (
                <TableRow key={wh.id} className="hover:bg-muted/30 transition-colors">
                  {/* Code */}
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    {wh.code || wh.warehouse_code || "—"}
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Link
                        href={`/admin/inventory/warehouses/${wh.id}`}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {wh.name}
                      </Link>
                      {wh.is_default && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary font-normal">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {formatTypeLabel(wh)}
                    </span>
                  </TableCell>

                  {/* Location */}
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 max-w-[150px] truncate" title={wh.address || wh.city || ""}>
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{wh.city || wh.address || "Not specified"}</span>
                    </div>
                  </TableCell>

                  {/* Manager */}
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{wh.manager_name || "—"}</span>
                    </div>
                  </TableCell>

                  {/* Products */}
                  <TableCell className="text-right font-medium text-xs">
                    {wh.total_products !== undefined ? wh.total_products : "—"}
                  </TableCell>

                  {/* Total Stock */}
                  <TableCell className="text-right font-bold text-xs">
                    {wh.total_stock !== undefined ? wh.total_stock.toLocaleString() : "—"}
                  </TableCell>

                  {/* Low Stock Items */}
                  <TableCell className="text-center">
                    {(wh.low_stock_items || 0) > 0 ? (
                      <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                        {wh.low_stock_items}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        wh.is_active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {wh.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>

                  {/* Created */}
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(wh.created_at).toLocaleDateString()}
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/inventory/warehouses/${wh.id}`} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href={`/admin/inventory/warehouses/${wh.id}/inventory`} className="cursor-pointer">
                            <Package className="mr-2 h-4 w-4" /> View Inventory
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setTransferSourceWarehouse(wh);
                            setTransferModalOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Stock
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href={`/admin/inventory/stock-movements?warehouse_id=${wh.id}`} className="cursor-pointer">
                            <History className="mr-2 h-4 w-4" /> View Stock Movements
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleToggleStatus(wh)} className="cursor-pointer">
                          <Power className="mr-2 h-4 w-4" />
                          {wh.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setWarehouseToDelete(wh)}
                          className="text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete / Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  No warehouses matching the criteria found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
          <div>
            Showing <strong>{Math.min(filteredWarehouses.length, (currentPage - 1) * pageSize + 1)}</strong> to{" "}
            <strong>{Math.min(filteredWarehouses.length, currentPage * pageSize)}</strong> of{" "}
            <strong>{filteredWarehouses.length}</strong> warehouses
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

      {/* Delete / Archive Confirmation Dialog */}
      <Dialog open={!!warehouseToDelete} onOpenChange={(open: boolean) => !open && setWarehouseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete / Archive Warehouse
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove warehouse <strong>{warehouseToDelete?.name}</strong> (Code:{" "}
              {warehouseToDelete?.code})?
              <br />
              <br />
              <span className="text-xs text-muted-foreground">
                Note: If this warehouse currently contains product stock, the system will automatically safeguard
                your inventory ledger by archiving and deactivating it rather than permanently dropping data.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={deleteLoading} onClick={() => setWarehouseToDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              variant="destructive"
            >
              {deleteLoading ? "Processing..." : "Confirm Delete / Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      {transferSourceWarehouse && (
        <StockTransferDialog
          open={transferModalOpen}
          onOpenChange={(open) => {
            setTransferModalOpen(open);
            if (!open) setTransferSourceWarehouse(null);
          }}
          sourceWarehouse={transferSourceWarehouse}
          allWarehouses={allWarehousesForTransfer.length > 0 ? allWarehousesForTransfer : initialWarehouses}
        />
      )}
    </div>
  );
}
