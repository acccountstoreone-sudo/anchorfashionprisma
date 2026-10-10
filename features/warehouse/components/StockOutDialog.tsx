"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackageMinus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { stockOutAction, getWarehouseInventoryAction } from "@/actions/warehouse.actions";

interface StockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  warehouseName?: string;
  allowNegativeStock?: boolean;
}

export function StockOutDialog({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  allowNegativeStock = false,
}: StockOutDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("CUSTOMER_ORDER");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");

  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    if (warehouseId && open) {
      setProductsLoading(true);
      getWarehouseInventoryAction(warehouseId, { limit: 100 }).then((res) => {
        setProductsLoading(false);
        if (res.data?.data) {
          setAvailableProducts(res.data.data);
          if (res.data.data.length > 0 && !variantId) {
            setVariantId(res.data.data[0].variant_id);
          }
        }
      });
    }
  }, [warehouseId, open]);

  const selectedProduct = availableProducts.find((p) => p.variant_id === variantId);
  const maxAvailable = selectedProduct?.quantity_available || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId) {
      toast.error("Please select a product variant");
      return;
    }
    if (quantity <= 0) {
      toast.error("Removal quantity must be greater than zero");
      return;
    }
    if (!allowNegativeStock && quantity > maxAvailable) {
      toast.error(`Removal exceeds available quantity (${maxAvailable} units). Negative stock is disabled.`);
      return;
    }

    setLoading(true);
    const res = await stockOutAction({
      variant_id: variantId,
      warehouse_id: warehouseId,
      bin_id: selectedProduct?.bin_id || undefined,
      quantity,
      reason,
      notes: notes || `Stock Out for ${reason}`,
      reference_id: referenceId || undefined,
    });
    setLoading(false);

    if (res.success) {
      toast.success(`Successfully removed ${quantity} units from inventory`);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to execute Stock Out");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <PackageMinus className="h-5 w-5" />
            Stock Out — Goods Issue ({warehouseName || "Warehouse"})
          </DialogTitle>
          <DialogDescription>
            Dispatch or remove inventory for orders, store sales, damage, loss, or internal usage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Product Selector */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Product Variant *</Label>
              {selectedProduct && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Available in WH: {maxAvailable} units
                </span>
              )}
            </div>
            <Select value={variantId} onValueChange={(v) => setVariantId(v || "")}>
              <SelectTrigger className="text-xs mt-1.5">
                <SelectValue placeholder={productsLoading ? "Loading inventory..." : "Select product"} />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((p) => (
                  <SelectItem key={p.variant_id} value={p.variant_id}>
                    {p.product_name} ({p.sku}) — {p.quantity_available} avail {p.zone_name ? `[${p.zone_name}]` : ""}
                  </SelectItem>
                ))}
                {availableProducts.length === 0 && (
                  <SelectItem value="none" disabled>
                    No inventory available in this warehouse
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Quantity to Remove *</Label>
              <Input
                type="number"
                min={1}
                max={!allowNegativeStock && maxAvailable > 0 ? maxAvailable : undefined}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-xs mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Removal Reason *</Label>
              <Select value={reason} onValueChange={(v) => setReason(v || "CUSTOMER_ORDER")}>
                <SelectTrigger className="text-xs mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER_ORDER">Customer Order</SelectItem>
                  <SelectItem value="SALES">POS / Direct Sales</SelectItem>
                  <SelectItem value="DAMAGED">Damaged Goods</SelectItem>
                  <SelectItem value="LOST">Inventory Shrinkage / Lost</SelectItem>
                  <SelectItem value="INTERNAL_USAGE">Internal Usage / Sampling</SelectItem>
                  <SelectItem value="MANUAL_ADJUSTMENT">Manual Adjustment</SelectItem>
                  <SelectItem value="OTHER">Other Reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference ID */}
          <div>
            <Label className="text-xs">Order / Reference ID (Optional)</Label>
            <Input
              placeholder="e.g. ORD-98124 or DISP-001"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="text-xs mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes / Explanation</Label>
            <Textarea
              placeholder="Reasoning for dispatch, packaging condition, QA inspector name..."
              className="resize-none text-xs mt-1"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Negative stock alert if applicable */}
          {!allowNegativeStock && maxAvailable === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Selected product has zero stock. Negative stock is disabled for this warehouse.</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || (!allowNegativeStock && maxAvailable <= 0)}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Stock Out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
