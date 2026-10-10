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
import { Scale, Loader2, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { stockAdjustmentAction, getWarehouseInventoryAction } from "@/actions/warehouse.actions";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  warehouseName?: string;
  preselectedProduct?: any;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  preselectedProduct,
}: StockAdjustmentDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [variantId, setVariantId] = useState(preselectedProduct?.variant_id || "");
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [reason, setReason] = useState<string>("PHYSICAL_COUNT");
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
          if (!variantId && res.data.data.length > 0) {
            setVariantId(res.data.data[0].variant_id);
            setPhysicalCount(res.data.data[0].quantity_available);
          }
        }
      });
    }
  }, [warehouseId, open]);

  useEffect(() => {
    if (preselectedProduct) {
      setVariantId(preselectedProduct.variant_id);
      setPhysicalCount(preselectedProduct.quantity_available || 0);
    }
  }, [preselectedProduct]);

  const selectedProduct = availableProducts.find((p) => p.variant_id === variantId) || preselectedProduct;
  const systemQuantity = selectedProduct ? selectedProduct.quantity_available || 0 : 0;
  const variance = physicalCount - systemQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId) {
      toast.error("Please select a product variant to adjust");
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is mandatory for manual stock adjustments");
      return;
    }

    setLoading(true);
    const res = await stockAdjustmentAction({
      variant_id: variantId,
      warehouse_id: warehouseId,
      bin_id: selectedProduct?.bin_id,
      physical_count: physicalCount,
      reason,
      notes,
    });
    setLoading(false);

    if (res.success) {
      toast.success(
        `Stock adjusted to ${physicalCount}. Variance recorded: ${variance > 0 ? "+" : ""}${variance}`
      );
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to adjust stock");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Manual Stock Count Adjustment ({warehouseName || "Warehouse"})
          </DialogTitle>
          <DialogDescription>
            Reconcile physical inventory counts against system records. Every adjustment produces an audit movement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Product Selector */}
          <div>
            <Label className="text-xs font-semibold">Product Variant *</Label>
            <Select
              value={variantId}
              onValueChange={(val) => {
                setVariantId(val);
                const p = availableProducts.find((item) => item.variant_id === val);
                if (p) setPhysicalCount(p.quantity_available || 0);
              }}
            >
              <SelectTrigger className="text-xs mt-1.5">
                <SelectValue placeholder={productsLoading ? "Loading inventory..." : "Select product"} />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((p) => (
                  <SelectItem key={p.variant_id} value={p.variant_id}>
                    {p.product_name} ({p.sku}) — System: {p.quantity_available}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variance Calculator Card */}
          <div className="grid grid-cols-3 gap-3 border rounded-lg p-3.5 bg-muted/20 text-center">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                System Qty
              </span>
              <div className="text-xl font-bold mt-1">{systemQuantity}</div>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Physical Count
              </span>
              <div className="mt-1">
                <Input
                  type="number"
                  min={0}
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-8 text-center font-bold text-base"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Variance
              </span>
              <div
                className={`text-xl font-bold mt-1 flex items-center justify-center gap-1 ${
                  variance === 0
                    ? "text-slate-600 dark:text-slate-400"
                    : variance > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {variance > 0 && <TrendingUp className="h-4 w-4" />}
                {variance < 0 && <TrendingDown className="h-4 w-4" />}
                {variance === 0 && <CheckCircle2 className="h-4 w-4" />}
                {variance > 0 ? `+${variance}` : variance}
              </div>
            </div>
          </div>

          {/* Reason (Mandatory) */}
          <div>
            <Label className="text-xs font-semibold">Adjustment Reason * (Mandatory)</Label>
            <Select value={reason} onValueChange={(v) => setReason(v || "PHYSICAL_COUNT")}>
              <SelectTrigger className="text-xs mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHYSICAL_COUNT">Routine Physical Count Discrepancy</SelectItem>
                <SelectItem value="DAMAGED_ITEMS">Damaged Goods Found in Bin</SelectItem>
                <SelectItem value="SHRINKAGE_THEFT">Theft / Unaccounted Shrinkage</SelectItem>
                <SelectItem value="SUPPLIER_MISMATCH">Supplier Delivery Quantity Discrepancy</SelectItem>
                <SelectItem value="DATA_CORRECTION">System Typo / Previous Entry Correction</SelectItem>
                <SelectItem value="EXPIRED_STOCK">Expired Product Write-off</SelectItem>
                <SelectItem value="OTHER">Other Reason</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Notes */}
          <div>
            <Label className="text-xs">Audit Explanatory Notes</Label>
            <Textarea
              placeholder="Auditor name, count sheet ID, supervisor sign-off..."
              className="resize-none text-xs mt-1"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply Stock Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
