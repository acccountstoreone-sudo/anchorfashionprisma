"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, ArrowLeftRight, Eye, AlertCircle, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockTransferActions } from "@/features/inventory/components/InventoryPageActions";

interface StockTransfersClientProps {
  transfers: any[];
  allWarehouses: any[];
  allVariants: any[];
}

export function StockTransfersClient({
  transfers = [],
  allWarehouses = [],
  allVariants = [],
}: StockTransfersClientProps) {
  const [search, setSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const q = search.toLowerCase();
      const variantSku = t.variants?.sku?.toLowerCase() || t.variant_id?.toLowerCase() || "";
      const variantName = t.variants?.name?.toLowerCase() || "";
      const reason = (t.reason_code || t.reason || "").toLowerCase();
      const notes = (t.notes || "").toLowerCase();

      return !search || variantSku.includes(q) || variantName.includes(q) || reason.includes(q) || notes.includes(q);
    });
  }, [transfers, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Transfers</h2>
          <p className="text-muted-foreground">
            Manage and audit internal location transfers between physical warehouses.
          </p>
        </div>
        <StockTransferActions allWarehouses={allWarehouses} allVariants={allVariants} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transfer by SKU, product, reason, notes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            Reset
          </Button>
        )}
      </div>

      {/* Transfers Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product / SKU</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const sku = t.variants?.sku || t.variant_id;
              const productName = t.variants?.name || "Product Item";
              const warehouseName = t.warehouses?.name || "Warehouse Location";

              return (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold">{sku}</span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{productName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <Warehouse className="h-3 w-3 text-muted-foreground" />
                      <span>{warehouseName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs">
                    <span className={t.quantity < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {t.reason_code || t.reason || "TRANSFER"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTransfer(t)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p>No stock transfer records found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Transfer Details Dialog */}
      <Dialog open={!!selectedTransfer} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Transfer Details
            </DialogTitle>
            <DialogDescription>
              Inspection data for this inventory transfer record.
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-3 text-sm pt-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {format(new Date(selectedTransfer.created_at), "PPP p")}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-mono font-semibold">
                  {selectedTransfer.variants?.sku || selectedTransfer.variant_id}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">{selectedTransfer.variants?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-bold">
                  {Math.abs(selectedTransfer.quantity)} units
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Reason Code:</span>
                <Badge variant="secondary">
                  {selectedTransfer.reason_code || selectedTransfer.reason || "TRANSFER"}
                </Badge>
              </div>
              {selectedTransfer.notes && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="rounded-md border bg-muted/20 p-2 text-xs">
                    {selectedTransfer.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
