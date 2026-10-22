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
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
} from "@/lib/actions/admin/catalog.actions";
import { uploadImageAction } from "@/lib/actions/upload.actions";
import { Brand } from "@/types/catalog.types";
import { Pencil, Trash2, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface BrandsClientPageProps {
  initialBrands: Brand[];
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function BrandsClientPage({ initialBrands }: BrandsClientPageProps) {
  const [brands, setBrands] = useState(initialBrands);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo_url: "",
    is_active: true,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "brands");
      formData.append("folder", "logos");

      const res = await uploadImageAction(formData);
      if (res.success && res.url) {
        setForm((f) => ({ ...f, logo_url: res.url || "" }));
        toast.success("Brand logo uploaded successfully");
      } else {
        toast.error(res.error || "Failed to upload logo");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const filtered = useMemo(
    () =>
      brands.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.slug.toLowerCase().includes(search.toLowerCase())
      ),
    [brands, search]
  );

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", slug: "", logo_url: "", is_active: true });
    setSheetOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditTarget(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      logo_url: (brand as any).logo_url ?? "",
      is_active: brand.is_active,
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

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required.");
      return;
    }
    setIsSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      logo_url: form.logo_url || null,
      is_active: form.is_active,
    };

    if (editTarget) {
      const res = await updateBrandAction({ id: editTarget.id, data: payload });
      if (res.success && res.data) {
        toast.success("Brand updated");
        setBrands((prev) =>
          prev.map((b) => (b.id === editTarget.id ? (res.data as Brand) : b))
        );
        setSheetOpen(false);
      } else {
        toast.error(res.error || "Failed to update brand");
      }
    } else {
      const res = await createBrandAction(payload as any);
      if (res.success && res.data) {
        toast.success("Brand created");
        setBrands((prev) => [res.data as Brand, ...prev]);
        setSheetOpen(false);
      } else {
        toast.error(res.error || "Failed to create brand");
      }
    }
    setIsSaving(false);
  };

  const confirmDelete = (brand: Brand) => {
    setDeleteTarget(brand);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteBrandAction({ id: deleteTarget.id });
    if (res.success) {
      toast.success("Brand deactivated");
      // Remove from local list (it's now inactive / soft-deleted)
      setBrands((prev) => prev.filter((b) => b.id !== deleteTarget.id));
    } else {
      toast.error(res.error || "Failed to delete brand");
    }
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  return (
    <>
      <CatalogPageShell
        title="Brands"
        description="Manage partner and internal brands in your catalog."
        addLabel="Add Brand"
        onAdd={openAdd}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search brands..."
      >
        <div className="rounded-md border bg-card text-card-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Logo</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {search
                      ? `No brands matching "${search}".`
                      : "No brands found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      {(brand as any).logo_url || (brand as any).logoUrl ? (
                        <div className="relative h-9 w-9 overflow-hidden rounded-md border bg-muted">
                          <Image
                            src={(brand as any).logo_url || (brand as any).logoUrl}
                            alt={brand.name}
                            fill
                            className="object-contain p-0.5"
                            sizes="36px"
                            unoptimized={
                              ((brand as any).logo_url || (brand as any).logoUrl).startsWith("data:") ||
                              ((brand as any).logo_url || (brand as any).logoUrl).startsWith("http")
                            }
                          />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground text-xs font-semibold">
                          {brand.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {brand.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={brand.is_active ? "default" : "secondary"}>
                        {brand.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(brand)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => confirmDelete(brand)}
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
            <SheetTitle>{editTarget ? "Edit Brand" : "Add Brand"}</SheetTitle>
            <SheetDescription>
              {editTarget
                ? "Update the details of this brand."
                : "Create a new brand for your catalog."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Name</Label>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Nike"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-slug">Slug</Label>
              <Input
                id="brand-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="e.g. nike"
              />
            </div>
            {/* Brand Logo Upload & Preview */}
            <div className="space-y-2">
              <Label>Brand Logo</Label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={form.logo_url}
                      alt="Brand Logo Preview"
                      fill
                      className="object-contain p-1"
                      unoptimized={form.logo_url.startsWith("data:") || form.logo_url.startsWith("http")}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90 transition-colors cursor-pointer"
                      title="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                    <ImageIcon className="h-6 w-6 opacity-40" />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      disabled={isUploading}
                      asChild
                    >
                      <span>
                        {isUploading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            Upload Logo Image
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    PNG, SVG, JPG or WebP (max 8MB)
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <Input
                  id="brand-logo"
                  value={form.logo_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, logo_url: e.target.value }))
                  }
                  placeholder="Or paste image URL (https://...)"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive brands are hidden from product forms.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_active: v }))
                }
              />
            </div>
          </div>
          <SheetFooter className="p-6 pt-4 border-t bg-background shrink-0 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : editTarget ? "Save Changes" : "Create Brand"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will deactivate the brand. It will no longer appear in product forms or the storefront."
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
