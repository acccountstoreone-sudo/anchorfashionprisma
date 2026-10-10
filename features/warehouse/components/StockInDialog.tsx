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
import { ArrowDownRight, Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Warehouse, WarehouseZone, WarehouseBin } from "@/types/inventory.types";
import { stockInAction, getWarehouseZones, getZoneBins } from "@/actions/warehouse.actions";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { getVariants, getSupplierProfiles } from "@/app/actions/admin/procurement.actions";

interface StockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  warehouseName?: string;
  zones?: WarehouseZone[];
}

export function StockInDialog({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  zones: initialZones = [],
}: StockInDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number | undefined>(undefined);
  const [supplierId, setSupplierId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [notes, setNotes] = useState("");

  // Location
  const [zones, setZones] = useState<WarehouseZone[]>(initialZones);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [bins, setBins] = useState<WarehouseBin[]>([]);
  const [selectedBinId, setSelectedBinId] = useState("");

  // Product variants list
  const [variants, setVariants] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    if (warehouseId) {
      getWarehouseZones(warehouseId).then((res) => {
        if (res.data) setZones(res.data);
      });

      // Load variants for selector via public client or API
      fetch("/api/inventory/low-stock")
        .catch(() => {})
        .finally(() => {});
    }
  }, [warehouseId]);

  // Load bins when zone selected
  useEffect(() => {
    if (selectedZoneId) {
      getZoneBins(selectedZoneId).then((res) => {
        if (res.data) setBins(res.data);
      });
    } else {
      setBins([]);
      setSelectedBinId("");
    }
  }, [selectedZoneId]);

  // Load product list and suppliers
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [varsRes, suppRes] = await Promise.all([
          getVariants(),
          getSupplierProfiles(),
        ]);

        if (varsRes.success && varsRes.data && varsRes.data.length > 0) {
          const loadedVariants = varsRes.data.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            name: v.name || v.title || `${v.product_name || "Product"} (${v.sku})`,
            cost: v.cost_price || 0,
          }));
          setVariants(loadedVariants);
          if (!variantId && loadedVariants.length > 0) {
            setVariantId(loadedVariants[0].id);
            setUnitCost(loadedVariants[0].cost);
          }
        }

        if (suppRes.success && suppRes.data) {
          setSuppliers(suppRes.data);
        }
      } catch (e) {
        console.error("Failed to load catalog for stock in:", e);
      }
    }
    loadCatalog();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId) {
      toast.error("Please select a product variant");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    setLoading(true);
    const res = await stockInAction({
      variant_id: variantId,
      warehouse_id: warehouseId,
      bin_id: selectedBinId || undefined,
      quantity,
      unit_cost: unitCost,
      supplier_id: supplierId || undefined,
      purchase_order_id: poNumber || undefined,
      batch_number: batchNumber || undefined,
      serial_number: serialNumber || undefined,
      manufacturing_date: mfgDate || undefined,
      expiry_date: expDate || undefined,
      notes,
    });
    setLoading(false);

    if (res.success) {
      toast.success(`Successfully received ${quantity} units into inventory`);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to complete Stock In");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Stock In — Goods Receipt ({warehouseName || "Warehouse"})
          </DialogTitle>
          <DialogDescription>
            Record inbound goods receipt from purchase orders, suppliers, or returns. Ledger quantity will update automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Product & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">Product Variant *</Label>
              <Select
                value={variantId}
                onValueChange={(val) => {
                  setVariantId(val || "");
                  const item = variants.find((v) => v.id === val);
                  if (item) setUnitCost(item.cost);
                }}
                disabled={variants.length === 0}
              >
                <SelectTrigger className="text-xs mt-1.5">
                  <SelectValue placeholder={variants.length === 0 ? "Loading variants..." : "Select product variant"} />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Quantity *</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-xs mt-1.5"
              />
            </div>
          </div>

          {/* Location Assignment (Zone & Bin/Shelf) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/20">
            <div>
              <Label className="text-xs font-semibold">Assign Zone (Optional)</Label>
              <Select value={selectedZoneId} onValueChange={(val) => setSelectedZoneId(val || "")}>
                <SelectTrigger className="text-xs mt-1.5">
                  <SelectValue placeholder="Select inbound zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Storage</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name} ({z.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Assign Shelf / Bin (Optional)</Label>
              <Select
                value={selectedBinId}
                onValueChange={(val) => setSelectedBinId(val || "")}
                disabled={!selectedZoneId || bins.length === 0}
              >
                <SelectTrigger className="text-xs mt-1.5">
                  <SelectValue placeholder={bins.length === 0 ? "No shelves in zone" : "Select shelf/bin"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned Shelf</SelectItem>
                  {bins.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier, Unit Cost & PO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Supplier (Optional)</Label>
              <Select value={supplierId || "none"} onValueChange={(val) => setSupplierId(val === "none" ? "" : (val || ""))}>
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Direct</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Unit Cost (BDT)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 450.00"
                value={unitCost ?? ""}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || undefined)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">PO Number / Ref</Label>
              <Input
                placeholder="PO-2026-0041"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Batch, Serial & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Batch / Lot Number</Label>
              <Input
                placeholder="B-99410"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Serial Number</Label>
              <Input
                placeholder="SN-002931"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Receipt Notes</Label>
            <Textarea
              placeholder="Challan number, delivery vehicle, gate pass, inspection remarks..."
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
              Confirm Stock In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
