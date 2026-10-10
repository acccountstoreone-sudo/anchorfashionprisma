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
import { Brand } from "@/types/catalog.types";
import { Pencil, Trash2 } from "lucide-react";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo_url: "",
    is_active: true,
  });

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
                    colSpan={4}
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
            <div className="space-y-1.5">
              <Label htmlFor="brand-logo">Logo URL (optional)</Label>
              <Input
                id="brand-logo"
                value={form.logo_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, logo_url: e.target.value }))
                }
                placeholder="https://..."
              />
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
