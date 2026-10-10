"use client";

import { useState, useMemo } from "react";
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
  createCollectionAction,
  updateCollectionAction,
  deleteCollectionAction,
} from "@/lib/actions/admin/catalog.actions";
import { uploadImageAction } from "@/lib/actions/upload.actions";
import { Collection } from "@/types/catalog.types";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  UploadCloud,
  X,
  Loader2,
  ImageIcon,
  ExternalLink,
  Search,
} from "lucide-react";

export interface AvailableProduct {
  id: string;
  name: string;
  slug: string;
  base_price?: number;
  image_url?: string | null;
}

interface CollectionsClientPageProps {
  initialCollections: Collection[];
  availableProducts?: AvailableProduct[];
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function CollectionsClientPage({
  initialCollections,
  availableProducts = [],
}: CollectionsClientPageProps) {
  const [collections, setCollections] = useState(initialCollections);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    slug: string;
    banner_url: string;
    is_active: boolean;
    product_ids: string[];
  }>({
    name: "",
    slug: "",
    banner_url: "",
    is_active: true,
    product_ids: [],
  });

  const filtered = useMemo(
    () =>
      collections.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase())
      ),
    [collections, search]
  );

  const openAdd = () => {
    setEditTarget(null);
    setForm({
      name: "",
      slug: "",
      banner_url: "",
      is_active: true,
      product_ids: [],
    });
    setProductSearch("");
    setSheetOpen(true);
  };

  const openEdit = (collection: Collection) => {
    setEditTarget(collection);
    setForm({
      name: collection.name,
      slug: collection.slug,
      banner_url: collection.banner_url ?? "",
      is_active: collection.is_active,
      product_ids: collection.product_ids || [],
    });
    setProductSearch("");
    setSheetOpen(true);
  };

  const toggleProduct = (productId: string) => {
    setForm((f) => {
      const exists = f.product_ids.includes(productId);
      return {
        ...f,
        product_ids: exists
          ? f.product_ids.filter((id) => id !== productId)
          : [...f.product_ids, productId],
      };
    });
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.toLowerCase();
    return availableProducts.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  }, [availableProducts, productSearch]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "collections");
      formData.append("folder", "banners");

      const res = await uploadImageAction(formData);
      if (res.success && res.url) {
        setForm((f) => ({ ...f, banner_url: res.url! }));
        toast.success("Banner image uploaded successfully");
      } else {
        toast.error(res.error || "Failed to upload banner image");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload banner image");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: editTarget ? f.slug : slugify(name),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required.");
      return;
    }
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      banner_url: form.banner_url || null,
      is_active: form.is_active,
      product_ids: form.product_ids,
    };

    if (editTarget) {
      const res = await updateCollectionAction({
        id: editTarget.id,
        data: payload,
      });
      if (res.success && res.data) {
        toast.success("Collection updated");
        setCollections((prev) =>
          prev.map((c) =>
            c.id === editTarget.id ? (res.data as Collection) : c
          )
        );
        setSheetOpen(false);
      } else {
        toast.error(res.error || "Failed to update collection");
      }
    } else {
      const res = await createCollectionAction(payload as any);
      if (res.success && res.data) {
        toast.success("Collection created");
        setCollections((prev) => [res.data as Collection, ...prev]);
        setSheetOpen(false);
      } else {
        toast.error(res.error || "Failed to create collection");
      }
    }
    setIsSaving(false);
  };

  const confirmDelete = (collection: Collection) => {
    setDeleteTarget(collection);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteCollectionAction({ id: deleteTarget.id });
    if (res.success) {
      toast.success("Collection deactivated");
      setCollections((prev) =>
        prev.filter((c) => c.id !== deleteTarget.id)
      );
    } else {
      toast.error(res.error || "Failed to delete collection");
    }
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  return (
    <>
      <CatalogPageShell
        title="Collections"
        description="Manage product collections and curated groupings."
        addLabel="Add Collection"
        onAdd={openAdd}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search collections..."
      >
        <div className="rounded-md border bg-card text-card-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Storefront</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {search
                      ? `No collections matching "${search}".`
                      : "No collections found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {collection.banner_url ? (
                          <img
                            src={collection.banner_url}
                            alt={collection.name}
                            className="h-9 w-14 rounded-md object-cover border border-border shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="h-9 w-14 rounded-md bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground">
                            <ImageIcon className="h-4 w-4 opacity-40" />
                          </div>
                        )}
                        <span className="font-medium">{collection.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {collection.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">
                        {collection.product_count ?? 0} {collection.product_count === 1 ? "item" : "items"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          collection.is_active ? "default" : "secondary"
                        }
                      >
                        {collection.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/collections/${collection.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        title="View on Storefront"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(collection)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => confirmDelete(collection)}
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
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editTarget ? "Edit Collection" : "Add Collection"}
            </SheetTitle>
            <SheetDescription>
              {editTarget
                ? "Update the details of this collection."
                : "Create a new product collection."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 py-6">
            <div className="space-y-1.5">
              <Label htmlFor="col-name">Name</Label>
              <Input
                id="col-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Summer 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-slug">Slug</Label>
              <Input
                id="col-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="e.g. summer-2026"
              />
            </div>

            {/* Banner Image Upload */}
            <div className="space-y-2">
              <Label>Banner Image (optional)</Label>
              {form.banner_url ? (
                <div className="relative rounded-lg overflow-hidden border border-border aspect-video w-full bg-muted/20">
                  <img
                    src={form.banner_url}
                    alt="Collection Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, banner_url: "" }))}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-primary/50 transition-colors bg-muted/10">
                  <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <label className="cursor-pointer inline-block">
                    <span className="text-xs font-semibold text-primary hover:underline">
                      Click to upload banner image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                    />
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              )}

              {isUploadingImage && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Uploading image...
                </div>
              )}

              <div className="pt-1">
                <Label htmlFor="col-banner" className="text-[11px] text-muted-foreground">
                  Or enter image URL
                </Label>
                <Input
                  id="col-banner"
                  value={form.banner_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, banner_url: e.target.value }))
                  }
                  placeholder="https://example.com/banner.jpg"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive collections are hidden from the storefront.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_active: v }))
                }
              />
            </div>

            {/* Assign Products to Collection */}
            <div className="space-y-2.5 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Assign Products</Label>
                  <p className="text-xs text-muted-foreground">
                    Select products included in this collection.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {form.product_ids.length} selected
                </Badge>
              </div>

              {availableProducts.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                  {/* Search and quick actions */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products..."
                        className="h-8 pl-8 text-xs bg-background"
                      />
                    </div>
                    {form.product_ids.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm((f) => ({ ...f, product_ids: [] }))}
                        className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Scrollable list */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-border/60 rounded-md border bg-background">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No products found matching &quot;{productSearch}&quot;.
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const isSelected = form.product_ids.includes(product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => toggleProduct(product.id)}
                            className={cn(
                              "flex items-center gap-3 p-2.5 cursor-pointer transition-colors hover:bg-muted/50 select-none",
                              isSelected && "bg-primary/5 font-medium"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary pointer-events-none shrink-0"
                            />
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-8 w-8 rounded object-cover border border-border shrink-0 bg-muted"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground text-[10px]">
                                Item
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs truncate font-medium text-foreground">
                                {product.name}
                              </p>
                              {product.base_price !== undefined && (
                                <p className="text-[11px] text-muted-foreground">
                                  ৳{product.base_price.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No products available in catalog.
                </p>
              )}
            </div>
          </div>
          <SheetFooter className="px-4">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? "Saving…"
                : editTarget
                  ? "Save Changes"
                  : "Create Collection"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will deactivate the collection. It will be hidden from the storefront."
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
