"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dispatchToBranchAction } from "@/lib/actions/admin/inventory-master.actions";
import { toast } from "sonner";
import { ArrowRightLeft, Building2, Warehouse, Loader2, CheckCircle2 } from "lucide-react";

interface BranchTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string; code?: string }>;
  variants: Array<{
    id: string;
    sku: string;
    barcode?: string;
    name?: string;
    productName?: string;
    available?: number;
    color?: string;
    size?: string;
  }>;
  onSuccess?: () => void;
  preselectedVariantId?: string;
}

export function BranchTransferModal({
  open,
  onOpenChange,
  warehouses = [],
  branches = [],
  variants = [],
  onSuccess,
  preselectedVariantId,
}: BranchTransferModalProps) {
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || "");
  const [destinationBranchId, setDestinationBranchId] = useState(branches[0]?.id || "");
  const [selectedVariantId, setSelectedVariantId] = useState(preselectedVariantId || variants[0]?.id || "");
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const maxAvailable = selectedVariant?.available ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWarehouseId) {
      toast.error("Please select a source warehouse.");
      return;
    }
    if (!destinationBranchId) {
      toast.error("Please select a destination retail branch.");
      return;
    }
    if (!selectedVariantId) {
      toast.error("Please select a product variant.");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (quantity > maxAvailable) {
      toast.error(`Quantity exceeds available stock (${maxAvailable} units).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await dispatchToBranchAction({
        sourceWarehouseId,
        destinationBranchId,
        variantId: selectedVariantId,
        quantity,
        notes,
      });

      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to dispatch stock transfer.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Dispatch Stock to Retail Branch
          </DialogTitle>
          <DialogDescription>
            Send products from central warehouse inventory directly to a retail outlet / showroom.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Source and Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                Source Warehouse
              </Label>
              <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Target Branch
              </Label>
              <Select value={destinationBranchId} onValueChange={setDestinationBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.code && `(${b.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Variant */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Product Variant</Label>
              {selectedVariant && (
                <span className="text-xs text-muted-foreground">
                  Available in Warehouse: <strong className="text-foreground">{maxAvailable} units</strong>
                </span>
              )}
            </div>
            <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.productName || v.name || "Item"} - {v.sku}{" "}
                    {v.color && `(${v.color} / ${v.size})`} [Stock: {v.available ?? 0}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quantity to Send</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={maxAvailable || 9999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32"
              />
              <div className="flex gap-1.5">
                {[10, 20, 50, 100].map((quickQty) => (
                  <Button
                    key={quickQty}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={quickQty > maxAvailable}
                    onClick={() => setQuantity(quickQty)}
                  >
                    +{quickQty}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Challan / Transfer Notes (Optional)</Label>
            <Textarea
              placeholder="e.g. Dispatched via Express Courier for weekend replenishment."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || maxAvailable === 0} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Dispatch to Branch
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
