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
  Plus,
  PackagePlus,
  Layers,
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
import { cn } from "@/lib/utils";

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
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card shadow-xs transition-all p-5 sm:p-6 space-y-4">
      {/* ── LUXURY STUDIO INVENTORY HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs">
              <Boxes className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
              Select Inventory Product to Publish
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              ✦ Step 1: Inventory-First Gate
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Every storefront product must originate in Inventory. Select an existing warehouse style below to link SKU, pricing, and live physical stock.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {onOpenIntakeDialog && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8.5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs gap-1.5 cursor-pointer"
              onClick={() => onOpenIntakeDialog(effectiveCategory !== "ALL" ? effectiveCategory : undefined)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add to Inventory First
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            className="h-8.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-semibold gap-1.5 shadow-2xs cursor-pointer text-xs"
            onClick={onOpenFullModal}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Browse Full Warehouse
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8.5 w-8.5 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse Shelf" : "Expand Shelf"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ── VERIFIED IMPORTED STYLE NOTIFICATION ── */}
      {activeItem && (
        <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-xs gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              Active Inventory Linked:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{activeItem.name}</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-700/60">
              Code: {activeItem.sku || "N/A"}
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-slate-600 dark:text-slate-400">
              Physical Stock: <strong className="text-slate-900 dark:text-white">{activeItem.totalAvailable || 0} units</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-slate-600 dark:text-slate-400">
              Cost: <strong>৳{activeItem.costPrice || 0}</strong> &rarr; Retail: <strong>৳{activeItem.basePrice || 0}</strong>
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
            onClick={onOpenFullModal}
          >
            Change Style
          </Button>
        </div>
      )}

      {/* ── EXPANDABLE QUICK POS SHELF ── */}
      {isOpen && (
        <div className="space-y-3.5 pt-1">
          {/* Category Dropdown and Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Direct Category Dropdown */}
            <div className="sm:col-span-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                Department:
              </span>
              <Select
                value={effectiveCategory || "ALL"}
                onValueChange={handleCategoryChange}
                items={[
                  { value: "ALL", label: "All Categories" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              >
                <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-900 text-xs font-medium border-slate-200/90 dark:border-slate-800 rounded-xl">
                  <SelectValue placeholder="Select Category">
                    {effectiveCategory === "ALL"
                      ? "All Categories"
                      : categories.find((c) => c.id === effectiveCategory)?.name || "All Categories"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-56 text-xs">
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
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search style name, code (e.g. AFPTS1, AFPNJ1), or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8.5 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Category Tabs for Fast 1-Click Filtering */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => handleCategoryChange("ALL")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                effectiveCategory === "ALL" || !effectiveCategory
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                  : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              )}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                  effectiveCategory === cat.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                    : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid Cards of Inventory Styles */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-600 dark:text-slate-300" />
              <span className="text-xs font-medium">Loading warehouse products...</span>
            </div>
          ) : shelfItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-8 text-center space-y-3">
              <div className="flex justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <PackagePlus className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  No inventory products found {effectiveCategory !== "ALL" ? `under "${currentCategoryName}"` : ""}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Every storefront product must first be registered in physical Inventory with stock, pricing, and barcodes.
                </p>
              </div>
              {onOpenIntakeDialog && (
                <Button
                  type="button"
                  onClick={() => onOpenIntakeDialog(effectiveCategory !== "ALL" ? effectiveCategory : undefined)}
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs gap-1.5 shadow-2xs cursor-pointer rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  Add {effectiveCategory !== "ALL" ? `"${currentCategoryName}"` : "Product"} to Inventory First
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {shelfItems.map((item) => {
                const isSelected = activeItem?.id === item.id || activeItem?.sku === item.sku;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative rounded-xl border p-3.5 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer",
                      isSelected
                        ? "border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-slate-50/60 dark:bg-slate-800/40"
                        : "border-slate-200/90 dark:border-slate-800"
                    )}
                    onClick={() => onSelectItem(item)}
                  >
                    <div>
                      {/* Short Code & Stock */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5 text-slate-500" />
                          {item.sku || "N/A"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                            {item.totalAvailable} in stock
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                        {item.name}
                      </h4>

                      {/* Category & Variants count */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.category?.name || item.category || "General"} &bull; {item.variantCount || item.variants?.length || 0} variants
                      </p>
                    </div>

                    {/* Financials & Select Button */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-400">
                          Cost: ৳{item.costPrice || 0}
                        </p>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          ৳{Number(item.basePrice || 0).toLocaleString()}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-7 px-3 text-[11px] font-semibold rounded-lg gap-1 cursor-pointer transition-all",
                          isSelected
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
                            : "bg-slate-100 hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:hover:bg-white dark:hover:text-slate-900 border-transparent text-slate-700 dark:text-slate-200"
                        )}
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
