"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getInventoryMasterListAction } from "@/lib/actions/admin/inventory-master.actions";
import { Search, PackageCheck, Boxes, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface InventoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: any) => void;
}

export function InventoryPickerModal({
  open,
  onOpenChange,
  onSelectProduct,
}: InventoryPickerModalProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open, search, statusFilter]);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const res = await getInventoryMasterListAction({
        search,
        status: statusFilter,
        limit: 30,
      });
      if (res.success && res.data) {
        setItems(res.data.items);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Select from Master Inventory
          </DialogTitle>
          <DialogDescription>
            Choose an item previously created in Inventory to auto-populate pricing, SKU, barcodes, and color/size variants.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name, SKU, or barcode..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {["ALL", "DRAFT", "ACTIVE"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                className="text-xs h-9"
                onClick={() => setStatusFilter(st)}
              >
                {st === "DRAFT" ? "Draft Inventory" : st === "ACTIVE" ? "Published" : "All Items"}
              </Button>
            ))}
          </div>
        </div>

        {/* Inventory Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading inventory master products...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-muted/20">
              <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No inventory products found</p>
              <p className="text-xs text-muted-foreground">
                Add products first in Inventory &rarr; Stock Intake.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/40 transition-all gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{item.name}</span>
                    <Badge
                      variant={item.status === "ACTIVE" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.status === "ACTIVE" ? "Published" : "Draft (Inventory)"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      SKU: <strong className="text-foreground">{item.sku}</strong>
                    </span>
                    <span>
                      Barcode: <strong className="text-foreground">{item.barcode}</strong>
                    </span>
                    <span>
                      Retail Price: <strong className="text-foreground">৳{item.basePrice}</strong>
                    </span>
                    <span>
                      Cost: <strong className="text-foreground">৳{item.costPrice}</strong>
                    </span>
                    <span className="text-emerald-600 font-medium">
                      Margin: {item.profitMarginPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    <Boxes className="h-3 w-3" />
                    <span>
                      In Stock: <strong className="text-foreground">{item.totalAvailable} units</strong> across{" "}
                      {item.variantCount} color/size variants
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    onSelectProduct(item);
                    onOpenChange(false);
                  }}
                >
                  Load Product
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
