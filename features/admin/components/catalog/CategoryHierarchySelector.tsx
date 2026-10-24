"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  FolderTree,
  Folder,
  FolderOpen,
  Tag,
  Search,
  Plus,
  Check,
  Star,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategoryAction } from "@/lib/actions/admin/catalog.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  parent_id?: string | null;
  parent?: { id: string; name: string } | null;
}

export interface CategoryHierarchySelectorProps {
  categories: CategoryItem[];
  selectedCategoryIds: string[];
  primaryCategoryId?: string | null;
  onSelectionChange: (selectedIds: string[], primaryId: string | null) => void;
  onCategoryCreated?: (newCategory: CategoryItem) => void;
  className?: string;
}

interface TreeNode {
  category: CategoryItem;
  children: TreeNode[];
  level: number;
  path: string; // e.g. "COLLECTIONS > Festive Collection"
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function CategoryHierarchySelector({
  categories,
  selectedCategoryIds = [],
  primaryCategoryId,
  onSelectionChange,
  onCategoryCreated,
  className,
}: CategoryHierarchySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "SELECTED" | "MOST_USED">("ALL");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [showAddNew, setShowAddNew] = useState(false);

  // New category form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatParentId, setNewCatParentId] = useState<string>("none");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Normalize category parentId (supports both parentId and parent_id)
  const normalizedCategories = useMemo(() => {
    return categories.map((c) => ({
      ...c,
      parentId: c.parentId ?? c.parent_id ?? null,
    }));
  }, [categories]);

  // Build hierarchical category tree
  const { tree, flatWithPaths, parentCategoryOptions } = useMemo(() => {
    const catMap = new Map<string, CategoryItem>();
    const childrenMap = new Map<string, CategoryItem[]>();

    for (const cat of normalizedCategories) {
      catMap.set(cat.id, cat);
      const pid = cat.parentId || "root";
      if (!childrenMap.has(pid)) {
        childrenMap.set(pid, []);
      }
      childrenMap.get(pid)!.push(cat);
    }

    const flatPaths: Array<{ category: CategoryItem; path: string; level: number }> = [];

    function buildBranch(pid: string, level: number, parentPath: string): TreeNode[] {
      const items = childrenMap.get(pid) || [];
      // Sort alphabetically within the same level
      items.sort((a, b) => a.name.localeCompare(b.name));

      return items.map((cat) => {
        const currentPath = parentPath ? `${parentPath} → ${cat.name}` : cat.name;
        flatPaths.push({ category: cat, path: currentPath, level });
        const children = buildBranch(cat.id, level + 1, currentPath);
        return {
          category: cat,
          children,
          level,
          path: currentPath,
        };
      });
    }

    const roots = buildBranch("root", 0, "");

    // Also collect any orphaned categories whose parentId is not in the system
    const allProcessedIds = new Set(flatPaths.map((f) => f.category.id));
    for (const cat of normalizedCategories) {
      if (!allProcessedIds.has(cat.id)) {
        flatPaths.push({ category: cat, path: cat.name, level: 0 });
        roots.push({
          category: cat,
          children: [],
          level: 0,
          path: cat.name,
        });
      }
    }

    // Format parent options for "+ Add New Category" dropdown with visual indent
    const parentOpts = flatPaths.map((f) => {
      const indent = "— ".repeat(f.level);
      return {
        id: f.category.id,
        label: `${indent}${f.category.name}`,
        rawName: f.category.name,
      };
    });

    return { tree: roots, flatWithPaths: flatPaths, parentCategoryOptions: parentOpts };
  }, [normalizedCategories]);

  // Auto-expand all root nodes by default
  React.useEffect(() => {
    if (expandedNodeIds.size === 0 && tree.length > 0) {
      const allParentIds = new Set<string>();
      for (const node of tree) {
        if (node.children.length > 0) {
          allParentIds.add(node.category.id);
        }
      }
      setExpandedNodeIds(allParentIds);
    }
  }, [tree]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    for (const item of flatWithPaths) {
      all.add(item.category.id);
    }
    setExpandedNodeIds(all);
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Toggle Category Checkbox
  const handleToggleCategory = (catId: string) => {
    const isCurrentlySelected = selectedCategoryIds.includes(catId);
    let nextSelected: string[];
    let nextPrimary = primaryCategoryId;

    if (isCurrentlySelected) {
      // Removing category
      nextSelected = selectedCategoryIds.filter((id) => id !== catId);
      // If we removed the primary category, auto-assign next available or null
      if (primaryCategoryId === catId) {
        nextPrimary = nextSelected.length > 0 ? nextSelected[0] : null;
      }
    } else {
      // Adding category
      nextSelected = [...selectedCategoryIds, catId];
      // If no primary is set, make this newly added category primary!
      if (!primaryCategoryId || !nextSelected.includes(primaryCategoryId)) {
        nextPrimary = catId;
      }
    }

    onSelectionChange(nextSelected, nextPrimary);
  };

  // Set Primary Category
  const handleSetPrimary = (catId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Ensure it's in the selected list
    const nextSelected = selectedCategoryIds.includes(catId)
      ? selectedCategoryIds
      : [...selectedCategoryIds, catId];
    onSelectionChange(nextSelected, catId);
    toast.success(`Primary category set to "${normalizedCategories.find((c) => c.id === catId)?.name || catId}"`);
  };

  // Handle Create New Category inline (Classic WordPress feature)
  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setIsCreatingCategory(true);
      const generatedSlug = slugify(trimmedName);
      const parentId = newCatParentId === "none" ? null : newCatParentId;

      const res = await createCategoryAction({
        name: trimmedName,
        slug: `${generatedSlug}-${Date.now().toString().slice(-4)}`,
        parent_id: parentId,
        is_active: true,
      });

      if (res.success && res.data) {
        const created = res.data;
        const newCatItem: CategoryItem = {
          id: created.id,
          name: created.name,
          slug: created.slug,
          parentId: created.parent_id || parentId,
          parent_id: created.parent_id || parentId,
        };

        toast.success(`🎉 Category "${created.name}" created!`);
        if (onCategoryCreated) {
          onCategoryCreated(newCatItem);
        }

        // Auto-select the newly created category for this product
        const nextSelected = [...selectedCategoryIds, created.id];
        const nextPrimary = primaryCategoryId || created.id;
        onSelectionChange(nextSelected, nextPrimary);

        // Reset form
        setNewCatName("");
        setNewCatParentId("none");
        setShowAddNew(false);
      } else {
        toast.error(res.error || "Failed to create category");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Filtered categories when search query is active
  const filteredFlatList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return flatWithPaths.filter(
      (f) =>
        f.category.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        (f.category.slug && f.category.slug.toLowerCase().includes(q))
    );
  }, [flatWithPaths, searchQuery]);

  // Selected categories list
  const selectedCategories = useMemo(() => {
    const list: Array<CategoryItem & { path?: string }> = [];
    for (const id of selectedCategoryIds) {
      const found = flatWithPaths.find((f) => f.category.id === id);
      if (found) {
        list.push({ ...found.category, path: found.path });
      } else {
        const cat = normalizedCategories.find((c) => c.id === id);
        if (cat) list.push(cat);
      }
    }
    return list;
  }, [selectedCategoryIds, flatWithPaths, normalizedCategories]);

  // Primary Category object
  const primaryCategory = useMemo(() => {
    if (!primaryCategoryId) return null;
    return normalizedCategories.find((c) => c.id === primaryCategoryId) || null;
  }, [primaryCategoryId, normalizedCategories]);

  // Render a single tree node recursively
  const renderTreeNode = (node: TreeNode) => {
    const isChecked = selectedCategoryIds.includes(node.category.id);
    const isPrimary = primaryCategoryId === node.category.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodeIds.has(node.category.id);
    const isRoot = node.level === 0;

    return (
      <div key={node.category.id} className="relative select-none">
        <div
          className={cn(
            "group flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg transition-all text-xs",
            isRoot
              ? "font-semibold text-foreground hover:bg-muted/60"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            isChecked && "bg-primary/5 text-primary font-medium hover:bg-primary/10",
            isPrimary && "bg-primary/10 ring-1 ring-primary/30"
          )}
          style={{
            paddingLeft: `${Math.max(8, node.level * 22 + 8)}px`,
          }}
        >
          {/* Visual tree guide line connector for nested levels */}
          {node.level > 0 && (
            <span
              className="absolute border-l-2 border-b-2 border-border/60 rounded-bl-sm pointer-events-none"
              style={{
                left: `${(node.level - 1) * 22 + 16}px`,
                top: "0px",
                width: "12px",
                height: "18px",
              }}
            />
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Expand / Collapse toggle for parents */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.category.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                aria-label={isExpanded ? "Collapse branch" : "Expand branch"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {/* Checkbox */}
            <Checkbox
              id={`cat-check-${node.category.id}`}
              checked={isChecked}
              onCheckedChange={() => handleToggleCategory(node.category.id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4 shrink-0 rounded"
            />

            {/* Icon */}
            {isRoot ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              )
            ) : (
              <Tag className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            )}

            {/* Category Name Label */}
            <Label
              htmlFor={`cat-check-${node.category.id}`}
              className={cn(
                "cursor-pointer truncate flex-1 leading-tight text-xs",
                isRoot ? "font-semibold tracking-tight" : "font-normal",
                isChecked && "font-semibold text-primary"
              )}
            >
              {node.category.name}
            </Label>

            {/* Subcategories count badge if parent */}
            {hasChildren && (
              <span className="text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.2 rounded-full font-mono shrink-0">
                {node.children.length}
              </span>
            )}
          </div>

          {/* Primary Category Pill / Set Primary Action */}
          <div className="flex items-center gap-1 shrink-0">
            {isChecked && isPrimary && (
              <Badge
                variant="default"
                className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold flex items-center gap-0.5 shadow-2xs"
                title="Primary category (used in breadcrumbs and permalinks)"
              >
                <Star className="h-2.5 w-2.5 fill-current" />
                Primary
              </Badge>
            )}

            {isChecked && !isPrimary && (
              <button
                type="button"
                onClick={(e) => handleSetPrimary(node.category.id, e)}
                className="text-[10px] text-muted-foreground/80 hover:text-primary hover:underline px-1 py-0.5 rounded hover:bg-primary/5 transition-colors"
                title="Make this the primary category"
              >
                Make Primary
              </button>
            )}
          </div>
        </div>

        {/* Render child nodes if expanded */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Box Header (WordPress Product Categories Style) */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">
            Product Categories
          </h3>
          <Badge
            variant={selectedCategoryIds.length > 0 ? "default" : "secondary"}
            className="text-[11px] px-2 py-0 font-semibold h-5"
          >
            {selectedCategoryIds.length}{" "}
            {selectedCategoryIds.length === 1 ? "Selected" : "Selected"}
          </Badge>
        </div>

        {/* Tree controls */}
        {activeTab === "ALL" && !searchQuery && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-primary transition-colors hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-primary transition-colors hover:underline cursor-pointer"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* Selected Categories Summary Strip */}
      {selectedCategoryIds.length > 0 ? (
        <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Assigned Storefront Categories:
            </span>
            <span className="text-[11px] text-muted-foreground">
              Click &times; to unassign
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {selectedCategories.map((cat) => {
              const isPrimary = primaryCategoryId === cat.id;
              return (
                <Badge
                  key={cat.id}
                  variant={isPrimary ? "default" : "secondary"}
                  className={cn(
                    "text-xs pl-2 pr-1 py-0.5 gap-1 transition-all flex items-center shadow-2xs",
                    isPrimary
                      ? "bg-primary text-primary-foreground font-bold border-primary"
                      : "bg-background text-foreground border-border/60 hover:bg-muted/80"
                  )}
                >
                  {isPrimary && <Star className="h-2.5 w-2.5 fill-current shrink-0" />}
                  <span className="truncate max-w-[160px]">{cat.name}</span>
                  {isPrimary && (
                    <span className="text-[9px] uppercase font-bold opacity-80 ml-0.5">
                      (Primary)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleCategory(cat.id);
                    }}
                    className="p-0.5 hover:bg-destructive/15 hover:text-destructive rounded-full transition-colors ml-0.5"
                    aria-label={`Remove ${cat.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            No category selected yet. Select one or more categories below so this product appears in relevant collections.
          </span>
        </div>
      )}

      {/* Tabs & Search Controls (Classic WordPress Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Quick Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                activeTab === "ALL"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("SELECTED")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1",
                activeTab === "SELECTED"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Selected
              {selectedCategoryIds.length > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] px-1 rounded-full font-bold">
                  {selectedCategoryIds.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("MOST_USED")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                activeTab === "MOST_USED"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Top Levels
            </button>
          </div>

          {/* Quick filter count */}
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {categories.length} total categories
          </span>
        </div>

        {/* Real-time Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search categories (e.g. Polo, Panjabi, Jacket)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Hierarchical Tree Box */}
      <div className="border border-border/70 rounded-xl bg-card/60 p-2 overflow-y-auto max-h-72 min-h-[160px] shadow-2xs">
        {/* If Search Query Active */}
        {searchQuery.trim() ? (
          filteredFlatList.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <Search className="h-5 w-5 mx-auto opacity-40 mb-1" />
              <p className="font-semibold text-foreground">No categories match &ldquo;{searchQuery}&rdquo;</p>
              <p>You can create this category below using &ldquo;+ Add New Category&rdquo;.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 uppercase tracking-wider">
                Matching Categories ({filteredFlatList.length})
              </div>
              {filteredFlatList.map((item) => {
                const isChecked = selectedCategoryIds.includes(item.category.id);
                const isPrimary = primaryCategoryId === item.category.id;

                return (
                  <div
                    key={item.category.id}
                    className={cn(
                      "flex items-center justify-between gap-2 p-2 rounded-lg text-xs transition-all border border-border/30",
                      isChecked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Checkbox
                        id={`search-check-${item.category.id}`}
                        checked={isChecked}
                        onCheckedChange={() => handleToggleCategory(item.category.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={`search-check-${item.category.id}`}
                          className="font-medium cursor-pointer text-foreground block truncate"
                        >
                          {item.category.name}
                        </Label>
                        <span className="text-[10px] text-muted-foreground block truncate font-mono">
                          {item.path}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isChecked && isPrimary && (
                        <Badge
                          variant="default"
                          className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold"
                        >
                          <Star className="h-2.5 w-2.5 fill-current mr-0.5" />
                          Primary
                        </Badge>
                      )}
                      {isChecked && !isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(item.category.id)}
                          className="text-[10px] text-muted-foreground hover:text-primary hover:underline px-1 py-0.5"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === "SELECTED" ? (
          /* Selected Tab */
          selectedCategories.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <CheckCircle2 className="h-6 w-6 mx-auto opacity-40 text-muted-foreground mb-1" />
              <p className="font-semibold text-foreground">No categories currently selected</p>
              <p>Switch to &ldquo;All Categories&rdquo; to check categories for this product.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 uppercase tracking-wider flex items-center justify-between">
                <span>Selected for Storefront ({selectedCategories.length})</span>
                <button
                  type="button"
                  onClick={() => onSelectionChange([], null)}
                  className="text-destructive hover:underline text-[10px]"
                >
                  Clear All
                </button>
              </div>

              {selectedCategories.map((cat) => {
                const isPrimary = primaryCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex items-center justify-between gap-2 p-2 rounded-lg text-xs border",
                      isPrimary
                        ? "bg-primary/10 border-primary/40 font-semibold"
                        : "bg-background border-border/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Checkbox
                        id={`tab-selected-${cat.id}`}
                        checked={true}
                        onCheckedChange={() => handleToggleCategory(cat.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={`tab-selected-${cat.id}`}
                          className="font-medium cursor-pointer text-foreground block truncate"
                        >
                          {cat.name}
                        </Label>
                        {cat.path && (
                          <span className="text-[10px] text-muted-foreground block truncate font-mono">
                            {cat.path}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPrimary ? (
                        <Badge
                          variant="default"
                          className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold flex items-center gap-0.5"
                        >
                          <Star className="h-2.5 w-2.5 fill-current" />
                          Primary
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(cat.id)}
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                        >
                          Make Primary
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                        title="Remove category"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === "MOST_USED" ? (
          /* Top Levels Tab */
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 uppercase tracking-wider">
              Top Level Parent Categories
            </div>
            {tree.map((node) => {
              const isChecked = selectedCategoryIds.includes(node.category.id);
              const isPrimary = primaryCategoryId === node.category.id;

              return (
                <div
                  key={node.category.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-2 rounded-lg text-xs border border-border/40 hover:bg-muted/40 transition-all",
                    isChecked && "bg-primary/5 border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Checkbox
                      id={`top-check-${node.category.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleCategory(node.category.id)}
                      className="h-4 w-4 shrink-0"
                    />
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    <Label
                      htmlFor={`top-check-${node.category.id}`}
                      className="font-bold cursor-pointer text-foreground block truncate"
                    >
                      {node.category.name}
                    </Label>
                    {node.children.length > 0 && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-full">
                        {node.children.length} subcategories
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isChecked && isPrimary && (
                      <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary font-bold">
                        <Star className="h-2.5 w-2.5 fill-current mr-0.5" />
                        Primary
                      </Badge>
                    )}
                    {isChecked && !isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(node.category.id)}
                        className="text-[10px] text-muted-foreground hover:text-primary hover:underline px-1 py-0.5"
                      >
                        Make Primary
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Full Hierarchical Tree View (All Categories) */
          <div className="space-y-0.5">
            {tree.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No categories available in the database.
              </div>
            ) : (
              tree.map(renderTreeNode)
            )}
          </div>
        )}
      </div>

      {/* WordPress-Style Inline "+ Add New Category" Section */}
      <div className="pt-1 border-t border-border/40">
        {!showAddNew ? (
          <button
            type="button"
            onClick={() => setShowAddNew(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add New Category
          </button>
        ) : (
          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Add New Category Inline
              </span>
              <button
                type="button"
                onClick={() => setShowAddNew(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCategory} className="space-y-2">
              <div>
                <Label htmlFor="inline-cat-name" className="text-[11px] font-medium text-muted-foreground">
                  New Category Name *
                </Label>
                <Input
                  id="inline-cat-name"
                  placeholder="e.g. Silk Panjabi, Casual Blazer..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-8 text-xs mt-1 bg-background"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="inline-cat-parent" className="text-[11px] font-medium text-muted-foreground">
                  Parent Category
                </Label>
                <Select
                  value={newCatParentId}
                  onValueChange={setNewCatParentId}
                >
                  <SelectTrigger id="inline-cat-parent" className="h-8 text-xs mt-1 bg-background">
                    <SelectValue placeholder="— None (Top Level) —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">— None (Top Level Category) —</SelectItem>
                    {parentCategoryOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs font-mono">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddNew(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingCategory || !newCatName.trim()}
                  className="h-7 text-xs font-semibold gap-1.5"
                >
                  {isCreatingCategory ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Add Category
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
