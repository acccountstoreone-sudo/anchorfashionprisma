"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInventoryMasterListAction } from "@/lib/actions/admin/inventory-master.actions";
import { getCategoriesAction } from "@/lib/actions/admin/products.actions";
import {
  Search,
  PackageCheck,
  Boxes,
  ArrowRight,
  Loader2,
  Sparkles,
  Filter,
  Tag,
  Folder,
  FolderOpen,
  Layers,
  X,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";

export interface CategoryOption {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  parent_id?: string | null;
  parent?: { id: string; name: string } | null;
}

export interface InventoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: any) => void;
  categories?: CategoryOption[];
  onOpenIntake?: (categoryId?: string) => void;
}

export function InventoryPickerModal({
  open,
  onOpenChange,
  onSelectProduct,
  categories: initialCategories = [],
  onOpenIntake,
}: InventoryPickerModalProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [selectedParentId, setSelectedParentId] = useState("ALL");
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  // Sync / Load categories
  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(initialCategories);
    } else if (open) {
      getCategoriesAction({}).then((res) => {
        if (res.success && res.data) {
          setCategories(
            res.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              parentId: c.parentId || c.parent_id,
              parent_id: c.parent_id || c.parentId,
              parent: c.parent,
            }))
          );
        }
      });
    }
  }, [open, initialCategories]);

  // Root / Department Categories (parentId is null)
  const rootCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId && !c.parent_id);
  }, [categories]);

  // Child lookup map: parentId -> CategoryOption[]
  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryOption[]>();
    for (const c of categories) {
      const pid = c.parentId || c.parent_id;
      if (pid) {
        const list = map.get(pid) || [];
        list.push(c);
        map.set(pid, list);
      }
    }
    return map;
  }, [categories]);

  // Calculate direct + recursive child counts for a category
  const getCategoryCount = (catId: string): number => {
    let count = categoryCounts[catId] || 0;
    const children = childrenByParent.get(catId) || [];
    for (const child of children) {
      count += getCategoryCount(child.id);
    }
    return count;
  };

  // Flattened hierarchical category list for the dropdown
  const hierarchicalCategories = useMemo(() => {
    const result: Array<{
      id: string;
      name: string;
      displayName: string;
      isParent: boolean;
      depth: number;
      path: string;
    }> = [];

    const processed = new Set<string>();

    const traverse = (cat: CategoryOption, depth: number, parentPath: string) => {
      processed.add(cat.id);
      const currentPath = parentPath ? `${parentPath} › ${cat.name}` : cat.name;
      const children = childrenByParent.get(cat.id) || [];
      const isParent = children.length > 0;
      const prefix = depth === 0 ? "📁 " : `${"  ".repeat(depth)}└─ 🏷️ `;

      result.push({
        id: cat.id,
        name: cat.name,
        displayName: `${prefix}${cat.name}`,
        isParent,
        depth,
        path: currentPath,
      });

      for (const child of children) {
        traverse(child, depth + 1, currentPath);
      }
    };

    for (const root of rootCategories) {
      traverse(root, 0, "");
    }

    // Categories without matching parent
    for (const c of categories) {
      if (!processed.has(c.id)) {
        result.push({
          id: c.id,
          name: c.name,
          displayName: `🏷️ ${c.name}`,
          isParent: false,
          depth: 0,
          path: c.name,
        });
      }
    }

    return result;
  }, [categories, rootCategories, childrenByParent]);

  // Subcategories belonging to currently selected root department
  const activeSubcategories = useMemo(() => {
    if (selectedParentId === "ALL") return [];
    return childrenByParent.get(selectedParentId) || [];
  }, [selectedParentId, childrenByParent]);

  // Active Category metadata
  const activeCategory = useMemo(() => {
    if (selectedCategoryId === "ALL") return null;
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Load Inventory Data
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
        limit: 60,
      });
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotalCount(res.data.total);
        if (res.data.categoryCounts) {
          setCategoryCounts(res.data.categoryCounts);
        }
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for category changes
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    if (catId === "ALL") {
      setSelectedParentId("ALL");
      return;
    }
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      const pid = cat.parentId || cat.parent_id;
      if (pid) {
        setSelectedParentId(pid);
      } else {
        setSelectedParentId(cat.id);
      }
    }
  };

  const handleSelectRootTab = (rootId: string) => {
    if (selectedParentId === rootId && selectedCategoryId === rootId) {
      // Toggle off to ALL if already clicked
      setSelectedCategoryId("ALL");
      setSelectedParentId("ALL");
    } else {
      setSelectedParentId(rootId);
      setSelectedCategoryId(rootId);
    }
  };

  // Grouped items by category path for organized view
  const groupedItems = useMemo(() => {
    if (!groupByCategory) return [];
    const groups: Record<string, any[]> = {};
    for (const item of items) {
      const key = item.categoryPath || item.category || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).map(([categoryName, groupItems]) => ({
      categoryName,
      items: groupItems,
    }));
  }, [items, groupByCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Clothing Inventory Master Picker
            </DialogTitle>
            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <Badge variant="outline" className="font-mono text-xs bg-muted/60">
                  {totalCount} Total Items
                </Badge>
              )}
              <Badge
                variant="outline"
                className="font-mono text-xs bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
              >
                Auto-Sync: Prices &bull; Stock &bull; Matrix
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Browse and filter inventory by category or search. Selecting an item automatically populates
            all product information, cost/sell prices, style code, and size/color matrix.
          </DialogDescription>
        </DialogHeader>

        {/* ─── 1. TOP DEPARTMENT / CATEGORY PILL RAIL ───────────────────── */}
        <div className="pt-2.5 pb-1 space-y-1.5 border-b">
          {/* Main Root Categories Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" />
              Category:
            </span>

            {/* All Categories Button */}
            <button
              type="button"
              onClick={() => handleSelectCategory("ALL")}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryId === "ALL" && selectedParentId === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/70 hover:bg-muted text-foreground border border-transparent hover:border-border"
              }`}
            >
              <span>All Products</span>
              {totalCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategoryId === "ALL" && selectedParentId === "ALL"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground font-mono"
                  }`}
                >
                  {totalCount}
                </span>
              )}
            </button>

            {/* Root / Department Categories */}
            {rootCategories.map((root) => {
              const isSelected = selectedParentId === root.id;
              const count = getCategoryCount(root.id);
              return (
                <button
                  key={root.id}
                  type="button"
                  onClick={() => handleSelectRootTab(root.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "bg-muted/70 hover:bg-muted text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  <span>{root.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-muted-foreground font-mono"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subcategory Row (Appears when a Parent Category is active) */}
          {activeSubcategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 pl-3 bg-muted/30 rounded-lg border border-dashed border-border/70 scrollbar-thin animate-in fade-in-50 duration-200">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider shrink-0 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                Subcategories:
              </span>

              {/* "All under parent" pill */}
              <button
                type="button"
                onClick={() => setSelectedCategoryId(selectedParentId)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all shrink-0 flex items-center gap-1 ${
                  selectedCategoryId === selectedParentId
                    ? "bg-primary/90 text-primary-foreground font-semibold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border"
                }`}
              >
                <span>All {categories.find((c) => c.id === selectedParentId)?.name}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-muted font-mono">
                  {getCategoryCount(selectedParentId)}
                </span>
              </button>

              {/* Subcategory pills */}
              {activeSubcategories.map((sub) => {
                const isSubSelected = selectedCategoryId === sub.id;
                const subCount = categoryCounts[sub.id] || 0;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectCategory(sub.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-md transition-all shrink-0 flex items-center gap-1 ${
                      isSubSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border"
                    }`}
                  >
                    <Tag className="h-2.5 w-2.5 opacity-70" />
                    <span>{sub.name}</span>
                    {subCount > 0 && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          isSubSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {subCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 2. FILTER & SEARCH CONTROLS BAR ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 py-2.5 border-b bg-muted/20 px-3 rounded-lg">
          {/* Hierarchical Category Dropdown */}
          <div className="md:col-span-4">
            <Select
              value={selectedCategoryId}
              onValueChange={handleSelectCategory}
              items={[
                { value: "ALL", label: "🌐 All Categories" },
                ...hierarchicalCategories.map((c) => ({
                  value: c.id,
                  label: `${c.displayName} ${
                    getCategoryCount(c.id) > 0 ? `(${getCategoryCount(c.id)})` : ""
                  }`,
                })),
              ]}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
                <SelectValue placeholder="Filter by Category">
                  {selectedCategoryId === "ALL"
                    ? "🌐 All Categories"
                    : hierarchicalCategories.find((c) => c.id === selectedCategoryId)?.path ||
                      categories.find((c) => c.id === selectedCategoryId)?.name ||
                      "Filter by Category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="ALL" className="font-semibold text-xs">
                  🌐 All Categories ({totalCount})
                </SelectItem>
                {hierarchicalCategories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className={`text-xs ${
                      cat.isParent ? "font-bold text-foreground" : "text-muted-foreground pl-4"
                    }`}
                  >
                    <span>{cat.displayName}</span>
                    {getCategoryCount(cat.id) > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                        ({getCategoryCount(cat.id)})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input with Category Keyword Support */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU, Name, Barcode, or Category (e.g. 'Panjabi', 'Shirt')..."
              className="pl-8 h-9 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter & View Toggle */}
          <div className="md:col-span-3 flex items-center gap-1.5 justify-end">
            {/* View Mode Toggle */}
            <Button
              type="button"
              variant={groupByCategory ? "secondary" : "ghost"}
              size="sm"
              className="h-9 px-2 text-xs"
              title={groupByCategory ? "Show Flat List" : "Group items by Category"}
              onClick={() => setGroupByCategory((prev) => !prev)}
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              <span className="text-[11px] hidden sm:inline">Group</span>
            </Button>

            {/* Status Pills */}
            <div className="flex items-center rounded-lg border bg-background p-0.5">
              {["ALL", "DRAFT", "ACTIVE"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "DRAFT" ? "Draft" : st === "ACTIVE" ? "Live" : "All"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Category Filter Bar (if filtered) */}
        {selectedCategoryId !== "ALL" && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs animate-in fade-in-50">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Showing inventory in:</span>
              <Badge variant="secondary" className="font-semibold text-xs text-primary gap-1">
                <FolderOpen className="h-3 w-3" />
                {hierarchicalCategories.find((c) => c.id === selectedCategoryId)?.path ||
                  activeCategory?.name ||
                  selectedCategoryId}
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({items.length} {items.length === 1 ? "item" : "items"})
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectCategory("ALL")}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear Filter
            </button>
          </div>
        )}

        {/* ─── 3. INVENTORY ITEMS LIST ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin mb-2 text-primary" />
              <p className="text-sm font-medium">Fetching inventory master catalog...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-muted/10 space-y-3 px-4">
              <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-semibold text-foreground">
                No inventory products found{" "}
                {selectedCategoryId !== "ALL" && activeCategory ? `in "${activeCategory.name}"` : ""}
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {selectedCategoryId !== "ALL"
                  ? "There are currently no inventory products under this category. You can clear the filter or intake a new product into inventory."
                  : "No items match your filter. You can add new styles in Admin → Inventory → New Stock Intake."}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {selectedCategoryId !== "ALL" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleSelectCategory("ALL")}
                  >
                    View All Categories
                  </Button>
                )}
                {onOpenIntake && (
                  <Button
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      onOpenIntake(selectedCategoryId !== "ALL" ? selectedCategoryId : undefined);
                      onOpenChange(false);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Intake New Item in Inventory
                  </Button>
                )}
              </div>
            </div>
          ) : groupByCategory ? (
            // ── GROUPED BY CATEGORY VIEW ──
            groupedItems.map((group) => (
              <div key={group.categoryName} className="space-y-2">
                <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 backdrop-blur-xs py-1.5 px-3 border rounded-lg shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs text-foreground">{group.categoryName}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      {group.items.length} {group.items.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <ProductCardItem
                      key={item.id}
                      item={item}
                      onSelectProduct={onSelectProduct}
                      onOpenChange={onOpenChange}
                      onFilterCategory={handleSelectCategory}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // ── FLAT LIST VIEW ──
            items.map((item) => (
              <ProductCardItem
                key={item.id}
                item={item}
                onSelectProduct={onSelectProduct}
                onOpenChange={onOpenChange}
                onFilterCategory={handleSelectCategory}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── PRODUCT CARD COMPONENT ────────────────────────────────────────────────
interface ProductCardItemProps {
  item: any;
  onSelectProduct: (product: any) => void;
  onOpenChange: (open: boolean) => void;
  onFilterCategory: (categoryId: string) => void;
}

function ProductCardItem({
  item,
  onSelectProduct,
  onOpenChange,
  onFilterCategory,
}: ProductCardItemProps) {
  return (
    <div className="p-3.5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Unique Style Code Badge */}
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {item.sku || "N/A"}
          </span>

          {/* Product Name */}
          <h4 className="font-semibold text-sm text-foreground truncate">{item.name}</h4>

          {/* Category Badge with 1-Click Filter */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (item.categoryId) {
                onFilterCategory(item.categoryId);
              }
            }}
            title="Click to filter by this category"
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/60 transition-colors cursor-pointer"
          >
            <Folder className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{item.categoryPath || item.category}</span>
          </button>

          {/* Status Badge */}
          <Badge
            variant={item.status === "ACTIVE" ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {item.status === "ACTIVE" ? "Published (Live)" : "Inventory Draft"}
          </Badge>
        </div>

        {/* Pricing & Profit Row */}
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
  );
}
