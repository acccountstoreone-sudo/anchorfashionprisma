"use client";

import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Folder,
  Search,
  Plus,
  Star,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Loader2,
  FolderTree,
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
  path: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Start with collapsed nodes so the UI remains compact and never renders an overwhelming list
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [showAddNew, setShowAddNew] = useState(false);

  // New category inline form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatParentId, setNewCatParentId] = useState<string>("none");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Normalize category parentId
  const normalizedCategories = useMemo(() => {
    return categories.map((c) => ({
      ...c,
      parentId: c.parentId ?? c.parent_id ?? null,
    }));
  }, [categories]);

  // Build hierarchical category tree
  const { tree, flatWithPaths, parentCategoryOptions } = useMemo(() => {
    const childrenMap = new Map<string, CategoryItem[]>();

    for (const cat of normalizedCategories) {
      const pid = cat.parentId || "root";
      if (!childrenMap.has(pid)) {
        childrenMap.set(pid, []);
      }
      childrenMap.get(pid)!.push(cat);
    }

    const flatPaths: Array<{ category: CategoryItem; path: string; level: number }> = [];

    function buildBranch(pid: string, level: number, parentPath: string): TreeNode[] {
      const items = childrenMap.get(pid) || [];
      items.sort((a, b) => a.name.localeCompare(b.name));

      return items.map((cat) => {
        const currentPath = parentPath ? `${parentPath} › ${cat.name}` : cat.name;
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

    // Collect any orphaned categories
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

    // Parent options for "+ Add Category"
    const parentOpts = flatPaths.map((f) => {
      const indent = "— ".repeat(f.level);
      return {
        id: f.category.id,
        label: `${indent}${f.category.name}`,
      };
    });

    return { tree: roots, flatWithPaths: flatPaths, parentCategoryOptions: parentOpts };
  }, [normalizedCategories]);

  // Toggle node expand/collapse
  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Category Checkbox
  const handleToggleCategory = (catId: string) => {
    const isCurrentlySelected = selectedCategoryIds.includes(catId);
    let nextSelected: string[];
    let nextPrimary = primaryCategoryId;

    if (isCurrentlySelected) {
      nextSelected = selectedCategoryIds.filter((id) => id !== catId);
      if (primaryCategoryId === catId) {
        nextPrimary = nextSelected.length > 0 ? nextSelected[0] : null;
      }
    } else {
      nextSelected = [...selectedCategoryIds, catId];
      if (!primaryCategoryId || !nextSelected.includes(primaryCategoryId)) {
        nextPrimary = catId;
      }
    }

    onSelectionChange(nextSelected, nextPrimary);
  };

  // Set Primary Category
  const handleSetPrimary = (catId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextSelected = selectedCategoryIds.includes(catId)
      ? selectedCategoryIds
      : [...selectedCategoryIds, catId];
    onSelectionChange(nextSelected, catId);
    toast.success(
      `Primary category set to "${normalizedCategories.find((c) => c.id === catId)?.name || catId}"`
    );
  };

  // Handle Create New Category inline
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

        toast.success(`Category "${created.name}" created!`);
        if (onCategoryCreated) {
          onCategoryCreated(newCatItem);
        }

        const nextSelected = [...selectedCategoryIds, created.id];
        const nextPrimary = primaryCategoryId || created.id;
        onSelectionChange(nextSelected, nextPrimary);

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
        f.path.toLowerCase().includes(q)
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

  // Render a single tree node recursively with clean indented lines
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
            "group flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg transition-all text-xs cursor-pointer",
            isChecked
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-2xs"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          )}
          style={{ paddingLeft: `${Math.max(6, node.level * 18 + 6)}px` }}
          onClick={() => handleToggleCategory(node.category.id)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Expand / Collapse icon */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.category.id, e)}
                className={cn(
                  "p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer transition-colors",
                  isChecked ? "text-white dark:text-slate-900" : "text-slate-400"
                )}
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
              id={`cat-node-${node.category.id}`}
              checked={isChecked}
              onCheckedChange={() => handleToggleCategory(node.category.id)}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "h-3.5 w-3.5 shrink-0 rounded border-slate-300 dark:border-slate-600",
                isChecked && "border-white bg-white text-slate-900 dark:border-slate-900 dark:bg-slate-900 dark:text-white"
              )}
            />

            {/* Category Name */}
            <span
              className={cn(
                "truncate text-xs tracking-tight",
                isRoot ? "font-semibold" : "font-normal",
                isChecked && "font-bold text-white dark:text-slate-900"
              )}
            >
              {node.category.name}
            </span>

            {/* Child count pill */}
            {hasChildren && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0",
                  isChecked
                    ? "bg-white/20 text-white dark:bg-black/15 dark:text-slate-900 font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                {node.children.length}
              </span>
            )}
          </div>

          {/* Primary category indicator or Make Primary action */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isChecked && isPrimary && (
              <Badge
                variant="default"
                className="h-4.5 px-2 text-[9px] font-bold flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-400 text-slate-950 border-none shadow-2xs"
              >
                <Star className="h-2.5 w-2.5 fill-slate-950 text-slate-950" />
                Primary
              </Badge>
            )}

            {isChecked && !isPrimary && (
              <button
                type="button"
                onClick={(e) => handleSetPrimary(node.category.id, e)}
                className={cn(
                  "text-[9px] hover:underline px-1 py-0.5 rounded transition-colors font-medium cursor-pointer",
                  isChecked ? "text-slate-300 dark:text-slate-600 hover:text-white" : "text-slate-400 hover:text-slate-900"
                )}
                title="Make this the primary category"
              >
                Make Primary
              </button>
            )}
          </div>
        </div>

        {/* Child branches if expanded */}
        {hasChildren && isExpanded && (
          <div className="relative pl-2 border-l border-slate-200/60 dark:border-slate-800 ml-3 my-0.5 space-y-0.5">
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("space-y-2.5", className)}>
      {/* ── CARD HEADER (Compact & Luxury) ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-slate-900 dark:text-white" />
          <Label className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
            Store Categories
          </Label>
        </div>
        {selectedCategoryIds.length > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {selectedCategoryIds.length} Assigned
          </span>
        )}
      </div>

      {/* ── ASSIGNED CATEGORIES CHIPS ── */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          {selectedCategories.map((cat) => {
            const isPrimary = primaryCategoryId === cat.id;
            return (
              <Badge
                key={cat.id}
                variant={isPrimary ? "default" : "secondary"}
                className={cn(
                  "text-xs pl-2.5 pr-1.5 py-1 gap-1.5 transition-all flex items-center rounded-lg shadow-2xs font-medium",
                  isPrimary
                    ? "bg-slate-900 hover:bg-slate-900 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-white font-semibold"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                {isPrimary && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
                <span className="truncate max-w-[130px]">{cat.name}</span>
                {isPrimary && (
                  <span className="text-[8px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-white/20 dark:bg-black/10">
                    Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className="p-0.5 hover:bg-red-500 hover:text-white rounded-md transition-colors ml-0.5 cursor-pointer"
                  aria-label={`Remove ${cat.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* ── COMPACT SELECTOR TRIGGER BUTTON ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between h-10 px-3.5 text-xs rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs cursor-pointer text-left"
      >
        <span className="flex items-center gap-2 text-slate-900 dark:text-white truncate font-medium">
          <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {selectedCategoryIds.length > 0
              ? `${selectedCategoryIds.length} categories assigned`
              : "Click to select or search categories..."}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-slate-900 dark:text-white"
          )}
        />
      </button>

      {/* ── DROPDOWN POPOVER PANEL (Fixed Height, Contained) ── */}
      {isOpen && (
        <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2.5 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search category (e.g. Shirts, Panjabi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 pr-7 h-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Tree Scroll Box (Constrained max height of 220px) */}
          <div className="max-h-56 overflow-y-auto pr-1 space-y-0.5 border-y border-slate-100 dark:border-slate-800/80 py-1.5 scrollbar-thin">
            {searchQuery.trim() ? (
              filteredFlatList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 space-y-1.5">
                  <p>No categories match &ldquo;{searchQuery}&rdquo;</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatName(searchQuery);
                      setShowAddNew(true);
                    }}
                    className="text-slate-900 dark:text-white hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    + Create &ldquo;{searchQuery}&rdquo; as new category
                  </button>
                </div>
              ) : (
                filteredFlatList.map((item) => {
                  const isChecked = selectedCategoryIds.includes(item.category.id);
                  const isPrimary = primaryCategoryId === item.category.id;

                  return (
                    <div
                      key={item.category.id}
                      className={cn(
                        "flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg text-xs cursor-pointer transition-colors",
                        isChecked
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      )}
                      onClick={() => handleToggleCategory(item.category.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Checkbox
                          id={`search-item-${item.category.id}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCategory(item.category.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 shrink-0 rounded"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs">{item.category.name}</span>
                          <span className={cn(
                            "block truncate text-[10px] font-mono",
                            isChecked ? "text-slate-300 dark:text-slate-600" : "text-slate-400"
                          )}>
                            {item.path}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isChecked && isPrimary && (
                          <Badge variant="default" className="h-4.5 px-1.5 text-[9px] bg-amber-400 text-slate-950 font-bold border-none">
                            Primary
                          </Badge>
                        )}
                        {isChecked && !isPrimary && (
                          <button
                            type="button"
                            onClick={(e) => handleSetPrimary(item.category.id, e)}
                            className={cn(
                              "text-[9px] hover:underline px-1 py-0.5 rounded cursor-pointer",
                              isChecked ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-900"
                            )}
                          >
                            Make Primary
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : tree.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                No categories found in store.
              </div>
            ) : (
              tree.map(renderTreeNode)
            )}
          </div>

          {/* Bottom Controls: + Add New Category Accordion & Done Button */}
          <div className="space-y-2 pt-1">
            {!showAddNew ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddNew(true)}
                  className="text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add New Category
                </button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs px-3 font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                  onClick={() => setIsOpen(false)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Done
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleCreateNewCategory}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700 space-y-2.5 text-xs animate-in fade-in-50"
              >
                <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                  <span>Create Category Inline</span>
                  <button
                    type="button"
                    onClick={() => setShowAddNew(false)}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Input
                  placeholder="Category Name (e.g. Denim Shirts)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
                  autoFocus
                />

                <Select value={newCatParentId} onValueChange={setNewCatParentId}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="Parent Category (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 text-xs">
                    <SelectItem value="none">No Parent (Top Level)</SelectItem>
                    {parentCategoryOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setShowAddNew(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreatingCategory || !newCatName.trim()}
                    className="h-7 text-xs px-3 gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold"
                  >
                    {isCreatingCategory && <Loader2 className="h-3 w-3 animate-spin" />}
                    Add Category
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
