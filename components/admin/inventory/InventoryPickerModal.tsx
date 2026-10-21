"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventoryMasterListAction } from "@/lib/actions/admin/inventory-master.actions";
import { getCategoriesAction } from "@/lib/actions/admin/products.actions";
import { Search, PackageCheck, Boxes, ArrowRight, Loader2, Sparkles, Filter, Tag } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

interface InventoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: any) => void;
  categories?: CategoryOption[];
}

export function InventoryPickerModal({
  open,
  onOpenChange,
  onSelectProduct,
  categories: initialCategories = [],
}: InventoryPickerModalProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load categories if not provided
  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(initialCategories);
    } else if (open) {
      getCategoriesAction({}).then((res) => {
        if (res.success && res.data) {
          setCategories(res.data.map((c: any) => ({ id: c.id, name: c.name })));
        }
      });
    }
  }, [open, initialCategories]);

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open, search, statusFilter, selectedCategoryId]);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const res = await getInventoryMasterListAction({
        search,
        status: statusFilter,
        categoryId: selectedCategoryId !== "ALL" ? selectedCategoryId : undefined,
        limit: 40,
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
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Clothing POS & Inventory Master Picker
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs bg-amber-50 text-amber-800 border-amber-200">
              Auto-Sync: Prices &bull; Stock &bull; Matrix
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Filter by Category or Search to select an inventory item. Selecting will auto-populate Product Name, Category, Buy/Cost Price, Sell/Retail Price, Short Code (SKU), and all Color/Size Variants!
          </DialogDescription>
        </DialogHeader>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 py-3 border-b bg-muted/20 px-3 rounded-lg">
          {/* Category Filter Dropdown */}
          <div className="md:col-span-4">
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Code (AFPTS1), Name, Barcode..."
              className="pl-8 h-9 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3 flex items-center gap-1 justify-end">
            {["ALL", "DRAFT", "ACTIVE"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                className="text-[11px] h-9 px-2.5"
                onClick={() => setStatusFilter(st)}
              >
                {st === "DRAFT" ? "Draft" : st === "ACTIVE" ? "Live" : "All"}
              </Button>
            ))}
          </div>
        </div>

        {/* Inventory Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin mb-2 text-primary" />
              <p className="text-sm font-medium">Fetching inventory master catalog...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-muted/10 space-y-2">
              <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-semibold text-foreground">No inventory products found</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No items match your filter. You can add new styles in Admin &rarr; Inventory &rarr; New Stock Intake.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Short Unique Style Code Badge */}
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {item.sku || "N/A"}
                    </span>

                    <h4 className="font-semibold text-sm text-foreground truncate">{item.name}</h4>

                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">
                      {item.category}
                    </Badge>

                    <Badge
                      variant={item.status === "ACTIVE" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.status === "ACTIVE" ? "Published (Live)" : "Inventory Draft"}
                    </Badge>
                  </div>

                  {/* Financial & Valuation Pill Row */}
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
                    <span className="text-muted-foreground">
                      Sell Price: <strong className="text-foreground font-semibold">৳{item.basePrice?.toLocaleString()}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Buy/Cost: <strong className="text-foreground font-semibold">৳{item.costPrice?.toLocaleString()}</strong>
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      Profit: +৳{item.unitProfit?.toLocaleString()} ({item.profitMarginPercent}%)
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      Barcode: {item.barcode}
                    </span>
                  </div>

                  {/* Stock Breakdown */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Boxes className="h-3.5 w-3.5 text-primary" />
                      In Stock: <strong className="text-primary">{item.totalAvailable} units</strong>
                    </span>
                    <span>&bull;</span>
                    <span>{item.variantCount} color/size variants</span>
                    {item.totalDispatched > 0 && (
                      <span className="text-purple-600 font-medium">
                        ({item.totalDispatched} dispatched to branches)
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0 flex items-center justify-end">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                    onClick={() => {
                      onSelectProduct(item);
                      onOpenChange(false);
                    }}
                  >
                    Select &amp; Populate
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
