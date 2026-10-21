"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Tag,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Layers,
  Plus,
  PackagePlus,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInventoryMasterListAction } from "@/lib/actions/admin/inventory-master.actions";

export interface InventoryPOSQuickShelfProps {
  onSelectItem: (item: any) => void;
  activeItem?: any;
  onOpenFullModal: () => void;
  categories?: Array<{ id: string; name: string }>;
  selectedCategoryId?: string;
  onSelectCategory?: (categoryId: string) => void;
  onOpenIntakeDialog?: (categoryId?: string) => void;
  refreshTrigger?: number;
}

export function InventoryPOSQuickShelf({
  onSelectItem,
  activeItem,
  onOpenFullModal,
  categories = [],
  selectedCategoryId,
  onSelectCategory,
  onOpenIntakeDialog,
  refreshTrigger = 0,
}: InventoryPOSQuickShelfProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  // Internal category state fallback if not controlled
  const [internalCategory, setInternalCategory] = useState("ALL");
  const effectiveCategory = selectedCategoryId !== undefined ? selectedCategoryId : internalCategory;

  const handleCategoryChange = (catId: string) => {
    setInternalCategory(catId);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  const [shelfItems, setShelfItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchShelf = async () => {
      try {
        setIsLoading(true);
        const res = await getInventoryMasterListAction({
          search,
          categoryId: effectiveCategory && effectiveCategory !== "ALL" ? effectiveCategory : undefined,
          limit: 12,
        });
        if (!isCancelled && res.success && res.data) {
          setShelfItems(res.data.items);
        }
      } catch (err) {
        console.error("Shelf load error:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchShelf();
    return () => {
      isCancelled = true;
    };
  }, [search, effectiveCategory, refreshTrigger]);

  const currentCategoryObj = categories.find((c) => c.id === effectiveCategory);
  const currentCategoryName = currentCategoryObj ? currentCategoryObj.name : "Selected Category";

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-xs transition-all space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Boxes className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-base text-foreground">
              Step 1: Select Category &amp; Import from Inventory
            </h3>
            <Badge
              variant="outline"
              className="text-[11px] bg-amber-50 text-amber-900 border-amber-300 font-semibold dark:bg-amber-950/40 dark:text-amber-300"
            >
              Inventory-First Policy
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            All storefront products originate in Inventory. Choose a category below to import an existing inventory style, or add a new one into Inventory first.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenIntakeDialog && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300 font-semibold text-xs gap-1.5 cursor-pointer"
              onClick={() => onOpenIntakeDialog(effectiveCategory !== "ALL" ? effectiveCategory : undefined)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add to Inventory First
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-8 bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5 shadow-sm cursor-pointer text-xs"
            onClick={onOpenFullModal}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Browse All Inventory
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse Shelf" : "Expand Shelf"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Currently Linked Style Badge (if an item is loaded) */}
      {activeItem && (
        <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-950 dark:text-emerald-200">
              Active Inventory Style Imported:
            </span>
            <span className="font-bold text-foreground">{activeItem.name}</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30">
              Code: {activeItem.sku || "N/A"}
            </span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-muted-foreground">
              Stock: <strong className="text-foreground">{activeItem.totalAvailable || 0} units</strong>
            </span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-muted-foreground">
              Buy: <strong>৳{activeItem.costPrice || 0}</strong> &rarr; Sell: <strong>৳{activeItem.basePrice || 0}</strong>
            </span>
            {(activeItem.totalSold || activeItem.soldCount || 0) > 0 && (
              <>
                <span className="text-muted-foreground">&bull;</span>
                <span className="font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200">
                  🛒 {activeItem.totalSold || activeItem.soldCount} units sold
                </span>
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onOpenFullModal}
          >
            Switch Style
          </Button>
        </div>
      )}

      {/* Expandable Quick POS Shelf */}
      {isOpen && (
        <div className="space-y-3 pt-1">
          {/* Category Dropdown and Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Direct Category Dropdown (Clean, human-readable names) */}
            <div className="sm:col-span-5 flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-amber-600" />
                Category:
              </span>
              <Select
                value={effectiveCategory || "ALL"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="h-9 bg-background/90 text-xs font-medium border-border/80">
                  <SelectValue placeholder="Select Category" />
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

            {/* Quick Search Input */}
            <div className="sm:col-span-7 relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search style name, style code (e.g. AFPTS1, AFPNJ1), or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-xs bg-background/90 border-border/80"
              />
            </div>
          </div>

          {/* Quick Category Chips for Fast 1-Click Filtering */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleCategoryChange("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                effectiveCategory === "ALL" || !effectiveCategory
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-background/80 text-muted-foreground hover:bg-background border border-border"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  effectiveCategory === cat.id
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-background/80 text-muted-foreground hover:bg-background border border-border"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Horizontal / Grid Cards of Inventory Styles */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-xs">Loading inventory products...</span>
            </div>
          ) : shelfItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-card/60 p-6 text-center space-y-3">
              <div className="flex justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  <PackagePlus className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  No inventory products found {effectiveCategory !== "ALL" ? `under "${currentCategoryName}"` : ""}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Every storefront product must be registered in Inventory first with its cost price, sell price, and color/size quantity matrix.
                </p>
              </div>
              {onOpenIntakeDialog && (
                <Button
                  type="button"
                  onClick={() => onOpenIntakeDialog(effectiveCategory !== "ALL" ? effectiveCategory : undefined)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add {effectiveCategory !== "ALL" ? `"${currentCategoryName}"` : "Product"} to Inventory First
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {shelfItems.map((item) => {
                const isSelected = activeItem?.id === item.id || activeItem?.sku === item.sku;

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-xl border p-3.5 bg-card hover:border-amber-500/50 hover:shadow-sm transition-all flex flex-col justify-between space-y-2.5 cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30"
                        : "border-border/70"
                    }`}
                    onClick={() => onSelectItem(item)}
                  >
                    <div>
                      {/* Short Code & Stock */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5" />
                          {item.sku || "N/A"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                            {item.totalAvailable} in stock
                          </span>
                          {(item.totalSold || 0) > 0 && (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {item.totalSold} sold
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {item.name}
                      </h4>

                      {/* Category & Variants count */}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.category?.name || item.category || "General"} &bull; {item.variantCount || item.variants?.length || 0} variants
                      </p>
                    </div>

                    {/* Financials & Select Button */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          Buy: <strong>৳{item.costPrice || 0}</strong>
                        </p>
                        <p className="font-bold text-foreground">
                          Sell: ৳{item.basePrice || 0}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={`h-7 px-2.5 text-[10px] font-bold gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-amber-600 text-white hover:bg-amber-500"
                            : "hover:bg-amber-50 hover:text-amber-800 border-amber-300"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                      >
                        {isSelected ? "Imported ✓" : "Import Style"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
