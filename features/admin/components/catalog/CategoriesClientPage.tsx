"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import { CatalogPageShell } from "@/features/admin/components/shared/CatalogPageShell";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/lib/actions/admin/catalog.actions";
import { Category } from "@/types/catalog.types";
import {
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  Search,
  X,
  Upload,
  Loader2,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadImageAction } from "@/lib/actions/upload.actions";
import { cn } from "@/lib/utils";

interface CategoriesClientPageProps {
  initialCategories: Category[];
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function getCategoryPath(cat: Category, allCats: Category[]): string {
  const path = [cat.name];
  let current = cat;
  const visited = new Set<string>([cat.id]);
  while (current.parent_id) {
    const parent = allCats.find((c) => c.id === current.parent_id);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    path.unshift(parent.name);
    current = parent;
  }
  return path.join(" → ");
}

interface ParentCategorySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  categories: Category[];
  excludeId?: string | null;
}

function ParentCategorySelect({
  value,
  onChange,
  categories,
  excludeId,
}: ParentCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the dropdown container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard accessibility (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Available parent categories (exclude category itself & descendants when editing)
  const availableParents = useMemo(() => {
    if (!excludeId) return categories;

    const descendants = new Set<string>();
    const findChildren = (pid: string) => {
      for (const cat of categories) {
        if (cat.parent_id === pid && !descendants.has(cat.id)) {
          descendants.add(cat.id);
          findChildren(cat.id);
        }
      }
    };
    findChildren(excludeId);
    descendants.add(excludeId);

    return categories.filter((c) => !descendants.has(c.id));
  }, [categories, excludeId]);

  const parentOptionsList = useMemo(() => {
    return availableParents
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        path: getCategoryPath(cat, categories),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [availableParents, categories]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return parentOptionsList;
    const q = search.toLowerCase();
    return parentOptionsList.filter(
      (item) =>
        item.path.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [parentOptionsList, search]);

  const selectedOption = useMemo(() => {
    if (!value || value === "none") return null;
    return (
      parentOptionsList.find((p) => p.id === value) ||
      categories.find((c) => c.id === value)
    );
  }, [value, parentOptionsList, categories]);

  const selectedLabel = selectedOption
    ? "path" in selectedOption
      ? selectedOption.path
      : selectedOption.name
    : "None (Root)";

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        id="cat-parent"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearch("");
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring text-left",
          isOpen && "ring-1 ring-ring"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {selectedLabel}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedOption && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Clear parent (set as Root)"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          {parentOptionsList.length > 5 && (
            <div className="p-1 border-b border-border/60 mb-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-muted/50 text-muted-foreground">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search category..."
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5 p-0.5">
            {/* None (Root) option */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                !selectedOption && "bg-accent/60 font-medium text-foreground"
              )}
            >
              <div>
                <div className="font-medium">None (Root)</div>
                <div className="text-[11px] text-muted-foreground">
                  Top-level category (no parent)
                </div>
              </div>
              {!selectedOption && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </button>

            {parentOptionsList.length > 0 && (
              <div className="h-px bg-border/60 my-1" />
            )}

            {/* Filtered category items */}
            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                No matching categories found.
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSelected = selectedOption && selectedOption.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/60 font-medium text-foreground"
                    )}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-medium">{item.name}</div>
                      {item.path !== item.name && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {item.path}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoriesClientPage({
  initialCategories,
}: CategoriesClientPageProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    parent_id: string | null;
    icon_url: string;
    is_active: boolean;
    display_order: number;
  }>({
    name: "",
    slug: "",
    parent_id: "",
    icon_url: "",
    is_active: true,
    display_order: 0,
  });

  const filtered = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase())
      ),
    [categories, search]
  );

  const openAdd = () => {
    setEditTarget(null);
    setForm({
      name: "",
      slug: "",
      parent_id: "",
      icon_url: "",
      is_active: true,
      display_order: 0,
    });
    setSheetOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditTarget(category);
    setForm({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id ?? "",
      icon_url: category.icon_url ?? "",
      is_active: category.is_active,
      display_order: category.display_order,
    });
    setSheetOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: editTarget ? f.slug : slugify(name),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "products");
      formData.append("folder", "categories");

      const res = await uploadImageAction(formData);
      if (res.success && res.url) {
        const uploadedUrl = res.url;
        setForm((f) => ({ ...f, icon_url: uploadedUrl }));
        toast.success("Category image uploaded successfully");
      } else {
        toast.error(res.error || "Failed to upload image");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      parent_id:
        form.parent_id &&
        form.parent_id !== "none" &&
        form.parent_id.trim() !== ""
          ? form.parent_id
          : null,
      image_url:
        form.icon_url && form.icon_url.trim() !== ""
          ? form.icon_url.trim()
          : null,
      icon_url:
        form.icon_url && form.icon_url.trim() !== ""
          ? form.icon_url.trim()
          : null,
      is_active: form.is_active,
      display_order: form.display_order,
    };

    if (editTarget) {
      const res = await updateCategoryAction({ id: editTarget.id, data: payload });
      if (res.success && res.data) {
        toast.success("Category updated");
        setCategories((prev) =>
          prev.map((c) => (c.id === editTarget.id ? (res.data as Category) : c))
        );
        setSheetOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update category");
      }
    } else {
      const res = await createCategoryAction(payload as any);
      if (res.success && res.data) {
        toast.success("Category created");
        setCategories((prev) => [res.data as Category, ...prev]);
        setSheetOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create category");
      }
    }
    setIsSaving(false);
  };

  const confirmDelete = (category: Category) => {
    setDeleteTarget(category);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteCategoryAction({ id: deleteTarget.id });
    if (res.success) {
      toast.success("Category deleted");
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    } else {
      toast.error(res.error || "Failed to delete category");
    }
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  return (
    <>
      <CatalogPageShell
        title="Categories"
        description="Manage your product category hierarchy."
        addLabel="Add Category"
        onAdd={openAdd}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories..."
      >
        <div className="rounded-md border bg-card text-card-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {search ? `No categories matching "${search}".` : "No categories found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      {category.icon_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-muted">
                          <Image
                            src={category.icon_url}
                            alt={category.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized={category.icon_url.startsWith("data:") || category.icon_url.startsWith("http")}
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                          <ImageIcon className="h-5 w-5 opacity-40" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {category.parent?.name ?? (
                        <span className="italic text-muted-foreground/60">Root</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{category.display_order}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {!category.parent_id && category.is_active && (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {category.display_order < 8 ? "Navbar Bar" : "Navbar More"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/catalog/categories/${category.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-zinc-900"
                            title="Manage Products"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(category)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => confirmDelete(category)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CatalogPageShell>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full p-0 gap-0">
          <SheetHeader className="p-6 pb-4 border-b shrink-0 text-left">
            <SheetTitle>{editTarget ? "Edit Category" : "Add Category"}</SheetTitle>
            <SheetDescription>
              {editTarget
                ? "Update the details of this category."
                : "Create a new category for your catalog."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Category Image */}
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-center gap-4">
                {form.icon_url ? (
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={form.icon_url}
                      alt="Category Preview"
                      fill
                      className="object-cover"
                      unoptimized={form.icon_url.startsWith("data:") || form.icon_url.startsWith("http")}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon_url: "" }))}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div>
                    <input
                      type="file"
                      id="category-image-input"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() =>
                        document.getElementById("category-image-input")?.click()
                      }
                      className="w-full gap-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    placeholder="Or paste image URL..."
                    value={form.icon_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, icon_url: e.target.value }))
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Men's Clothing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. mens-clothing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Parent Category</Label>
              <ParentCategorySelect
                value={form.parent_id}
                onChange={(newVal) =>
                  setForm((f) => ({ ...f, parent_id: newVal ?? "" }))
                }
                categories={categories}
                excludeId={editTarget?.id}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-order">Display Order</Label>
                <span className="text-xs text-muted-foreground font-mono">Lower = higher priority</span>
              </div>
              <Input
                id="cat-order"
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, display_order: Number(e.target.value) }))
                }
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Controls navigation bar sequence. The top 8 root categories with the lowest values appear directly on the main header bar; additional ones appear in the &ldquo;MORE&rdquo; menu.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active Status</p>
                <p className="text-xs text-muted-foreground">
                  Controls visibility on the store website and navbar menu.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <SheetFooter className="p-6 pt-4 border-t bg-background shrink-0 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : editTarget ? "Save Changes" : "Create Category"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete the category. Products in this category will become uncategorized."
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
