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
import { ArrowRightLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Warehouse, WarehouseZone, WarehouseBin } from "@/types/inventory.types";
import { stockTransferAction, getWarehouseZones, getZoneBins, getWarehouseInventoryAction } from "@/actions/warehouse.actions";

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWarehouse?: Warehouse;
  allWarehouses: Warehouse[];
  preselectedVariantId?: string;
}

export function StockTransferDialog({
  open,
  onOpenChange,
  sourceWarehouse,
  allWarehouses,
  preselectedVariantId,
}: StockTransferDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [fromWarehouseId, setFromWarehouseId] = useState<string>(sourceWarehouse?.id || "");
  const [toWarehouseId, setToWarehouseId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>(preselectedVariantId || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("REBALANCING");
  const [notes, setNotes] = useState<string>("");

  // Location breakdown
  const [fromZones, setFromZones] = useState<WarehouseZone[]>([]);
  const [toZones, setToZones] = useState<WarehouseZone[]>([]);
  const [selectedFromZone, setSelectedFromZone] = useState<string>("");
  const [selectedToZone, setSelectedToZone] = useState<string>("");

  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    if (sourceWarehouse?.id) {
      setFromWarehouseId(sourceWarehouse.id);
    }
  }, [sourceWarehouse]);

  // Load products stored in fromWarehouse
  useEffect(() => {
    if (fromWarehouseId) {
      setProductsLoading(true);
      getWarehouseInventoryAction(fromWarehouseId, { limit: 100 }).then((res) => {
        setProductsLoading(false);
        if (res.data?.data) {
          setAvailableProducts(res.data.data);
          if (res.data.data.length > 0 && !variantId) {
            setVariantId(res.data.data[0].variant_id);
          }
        }
      });

      getWarehouseZones(fromWarehouseId).then((res) => {
        if (res.data) setFromZones(res.data);
      });
    }
  }, [fromWarehouseId]);

  // Load zones for destination warehouse
  useEffect(() => {
    if (toWarehouseId) {
      getWarehouseZones(toWarehouseId).then((res) => {
        if (res.data) setToZones(res.data);
      });
    }
  }, [toWarehouseId]);

  const selectedProduct = availableProducts.find((p) => p.variant_id === variantId);
  const maxAvailable = selectedProduct?.quantity_available || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId) {
      toast.error("Please select a source warehouse");
      return;
    }
    if (!toWarehouseId) {
      toast.error("Please select a destination warehouse");
      return;
    }
    if (fromWarehouseId === toWarehouseId && !selectedFromZone && !selectedToZone) {
      toast.error("Source and destination warehouse cannot be identical without distinct zones");
      return;
    }
    if (!variantId) {
      toast.error("Please select a product variant to transfer");
      return;
    }
    if (quantity <= 0) {
      toast.error("Transfer quantity must be greater than zero");
      return;
    }
    if (quantity > maxAvailable) {
      toast.error(`Transfer quantity exceeds available stock (${maxAvailable} units)`);
      return;
    }

    setLoading(true);
    const res = await stockTransferAction({
      variant_id: variantId,
      from_warehouse_id: fromWarehouseId,
      from_zone_id: selectedFromZone || undefined,
      to_warehouse_id: toWarehouseId,
      to_zone_id: selectedToZone || undefined,
      quantity,
      reason,
      notes: notes || `Transfer of ${quantity} units from WH to WH`,
    });
    setLoading(false);

    if (res.success) {
      toast.success(`Successfully transferred ${quantity} units of stock`);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to execute stock transfer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transfer Inventory Stock
          </DialogTitle>
          <DialogDescription>
            Move inventory between warehouses or intra-facility zones. Inventory ledgers are updated atomically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Warehouse Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-3.5 bg-muted/20">
            {/* Source */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-primary">Source Warehouse *</Label>
              <Select value={fromWarehouseId} onValueChange={(val) => setFromWarehouseId(val || "")}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="From Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {allWarehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id} disabled={!wh.is_active}>
                      {wh.name} {wh.code ? `(${wh.code})` : ""} {!wh.is_active ? "- Inactive" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {fromZones.length > 0 && (
                <div className="pt-1">
                  <Label className="text-[11px] text-muted-foreground">Source Zone (Optional)</Label>
                  <Select value={selectedFromZone} onValueChange={(val) => setSelectedFromZone(val || "")}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Any / Default Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Any Zone</SelectItem>
                      {fromZones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-primary">Destination Warehouse *</Label>
              <Select value={toWarehouseId} onValueChange={(val) => setToWarehouseId(val || "")}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="To Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {allWarehouses
                    .filter((wh) => wh.id !== fromWarehouseId)
                    .map((wh) => (
                      <SelectItem key={wh.id} value={wh.id} disabled={!wh.is_active}>
                        {wh.name} {wh.code ? `(${wh.code})` : ""} {!wh.is_active ? "- Inactive" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {toZones.length > 0 && (
                <div className="pt-1">
                  <Label className="text-[11px] text-muted-foreground">Destination Zone (Optional)</Label>
                  <Select value={selectedToZone} onValueChange={(val) => setSelectedToZone(val || "")}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Any / Default Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Inbound Zone</SelectItem>
                      {toZones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Product & Quantity */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Product Variant *</Label>
                {selectedProduct && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Available: {maxAvailable} units
                  </span>
                )}
              </div>
              <Select value={variantId} onValueChange={(val) => setVariantId(val || "")}>
                <SelectTrigger className="text-xs mt-1.5">
                  <SelectValue placeholder={productsLoading ? "Loading products..." : "Select product"} />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.variant_id} value={p.variant_id}>
                      {p.product_name} ({p.sku}) — Available: {p.quantity_available}
                    </SelectItem>
                  ))}
                  {availableProducts.length === 0 && (
                    <SelectItem value="none" disabled>
                      No stock available in this warehouse
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Transfer Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxAvailable > 0 ? maxAvailable : 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Reason *</Label>
                <Select value={reason} onValueChange={(val) => setReason(val || "REBALANCING")}>
                  <SelectTrigger className="text-xs mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REBALANCING">Inventory Rebalancing</SelectItem>
                    <SelectItem value="STORE_REPLENISHMENT">Store Replenishment</SelectItem>
                    <SelectItem value="OUTLET_DEMAND">Outlet Customer Demand</SelectItem>
                    <SelectItem value="DAMAGED_RETURN">Damaged / Quarantine Area</SelectItem>
                    <SelectItem value="CONSOLIDATION">Warehouse Consolidation</SelectItem>
                    <SelectItem value="OTHER">Other Reason</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Transfer Notes</Label>
            <Textarea
              placeholder="Driver name, transit bill, consignment note..."
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
            <Button type="submit" disabled={loading || availableProducts.length === 0} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Execute Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
