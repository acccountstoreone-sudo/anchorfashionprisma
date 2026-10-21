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
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getInventoryMasterListAction } from "@/lib/actions/admin/inventory-master.actions";
import { formatCurrency } from "@/lib/utils";

export interface InventoryPOSQuickShelfProps {
  onSelectItem: (item: any) => void;
  activeItem?: any;
  onOpenFullModal: () => void;
  categories?: Array<{ id: string; name: string }>;
}

export function InventoryPOSQuickShelf({
  onSelectItem,
  activeItem,
  onOpenFullModal,
  categories = [],
}: InventoryPOSQuickShelfProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [shelfItems, setShelfItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchShelf = async () => {
      try {
        setIsLoading(true);
        const res = await getInventoryMasterListAction({
          search,
          categoryId: selectedCategory !== "ALL" ? selectedCategory : undefined,
          limit: 8,
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
  }, [search, selectedCategory]);

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-xs transition-all space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Boxes className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-base text-foreground">
              Clothing POS &amp; Warehouse Inventory Master
            </h3>
            <Badge
              variant="outline"
              className="text-[11px] bg-amber-50 text-amber-900 border-amber-300 font-semibold dark:bg-amber-950/40 dark:text-amber-300"
            >
              POS Sync Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Select any inventory style to automatically load Category, Buy/Cost Price, Sell Price, Short Code (AFPTS1), and Matrix!
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5 shadow-sm cursor-pointer text-xs"
            onClick={onOpenFullModal}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Browse Full Inventory
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
        <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-950 dark:text-emerald-200">
              Active Style Loaded:
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
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-background/80 text-muted-foreground hover:bg-background border border-border"
                }`}
              >
                All Styles
              </button>
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "bg-background/80 text-muted-foreground hover:bg-background border border-border"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search style or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background/80"
              />
            </div>
          </div>

          {/* Horizontal / Grid Cards of Inventory Styles */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-xs">Loading POS inventory shelf...</span>
            </div>
          ) : shelfItems.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl bg-background/40">
              <p className="text-xs text-muted-foreground">
                No inventory styles found for this filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {shelfItems.map((item) => {
                const profit = Number(item.basePrice || 0) - Number(item.costPrice || 0);
                const isSelected = activeItem?.id === item.id || activeItem?.sku === item.sku;

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-xl border p-3 bg-card hover:border-amber-500/50 hover:shadow-sm transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
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
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          {item.totalAvailable} in stock
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {item.name}
                      </h4>

                      {/* Category */}
                      <p className="text-[10px] text-muted-foreground">
                        {item.category} &bull; {item.variantCount} variants
                      </p>
                    </div>

                    {/* Financials & Select Button */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          Buy: <strong>৳{item.costPrice}</strong>
                        </p>
                        <p className="font-bold text-foreground">
                          Sell: ৳{item.basePrice}
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
                        {isSelected ? "Selected" : "Populate"}
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
