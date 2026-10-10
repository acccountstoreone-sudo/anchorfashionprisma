"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  CheckCircle2,
  Star,
  Package,
  LayoutGrid,
  List,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import { Product } from "@/types/catalog.types";
import {
  deleteAdminProductAction,
  duplicateAdminProductAction,
  bulkUpdateProductStatusAction,
  bulkDeleteProductsAction,
  bulkDeleteAllProductsAction,
} from "@/lib/actions/admin/products.actions";

export function ProductsTable({
  initialProducts,
  totalCount,
  currentPage = 1,
  pageSize = 20,
}: {
  initialProducts: Product[];
  totalCount: number;
  currentPage?: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllAcrossCatalog, setSelectAllAcrossCatalog] = useState(false);
  
  // Sync local state when server data changes (e.g. from search/filter/pagination)
  useEffect(() => {
    setProducts(initialProducts);
    setSelectedIds([]); // Clear selection on new data
    setSelectAllAcrossCatalog(false);
  }, [initialProducts]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
    isLoading?: boolean;
  }>({ open: false, title: "", description: "", onConfirm: async () => {} });

  const allSelected =
    products.length > 0 && selectedIds.length === products.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < products.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      setSelectAllAcrossCatalog(false);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectAllAcrossCatalog(false);
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const openConfirm = (
    title: string,
    description: string,
    onConfirm: () => Promise<void>
  ) => {
    setConfirmState({ open: true, title, description, onConfirm });
  };

  const handleDelete = (id: string) => {
    openConfirm(
      "Delete Product?",
      "This product will be archived and removed from your store. This cannot be undone.",
      async () => {
        setIsDeleting(id);
        setConfirmState((s) => ({ ...s, isLoading: true }));
        const res = await deleteAdminProductAction({ id });
        if (res.success) {
          toast.success("Product deleted successfully");
          setProducts((prev) => prev.filter((p) => p.id !== id));
          router.refresh();
        } else {
          toast.error(res.error || "Failed to delete product");
        }
        setIsDeleting(null);
        setConfirmState((s) => ({ ...s, open: false, isLoading: false }));
      }
    );
  };

  const handleDuplicate = async (id: string) => {
    setIsDuplicating(id);
    const res = await duplicateAdminProductAction({ id });
    if (res.success && res.data) {
      toast.success("Product duplicated");
      setIsDuplicating(null); // BUG FIX: was never cleared on success
      router.push(`/admin/products/${res.data.id}/edit`);
    } else {
      toast.error(res.error || "Failed to duplicate product");
      setIsDuplicating(null);
    }
  };

  const handleBulkAction = (action: "publish" | "archive" | "delete") => {
    if (selectedIds.length === 0) return;

    if (action === "delete") {
      const isCatalogWide = selectAllAcrossCatalog && totalCount > products.length;
      const countToDelete = isCatalogWide ? totalCount : selectedIds.length;
      openConfirm(
        `Delete ${isCatalogWide ? `ALL ${countToDelete}` : `${countToDelete}`} products?`,
        isCatalogWide
          ? `All ${countToDelete} products in your catalog matching the current view will be archived and removed from your store. This cannot be undone.`
          : "These products will be archived and removed from your store. This cannot be undone.",
        async () => {
          setConfirmState((s) => ({ ...s, isLoading: true }));
          if (isCatalogWide) {
            const res = await bulkDeleteAllProductsAction({
              status: statusFilter === "ALL" ? undefined : statusFilter,
              search: searchQuery || undefined,
            });
            if (res.success) {
              toast.success(`Deleted ${res.data?.count ?? countToDelete} products`);
              setProducts([]);
              setSelectedIds([]);
              setSelectAllAcrossCatalog(false);
              router.refresh();
            } else {
              toast.error(res.error || "Failed to delete products");
            }
          } else {
            const res = await bulkDeleteProductsAction({ ids: selectedIds });
            if (res.success) {
              toast.success(`Deleted ${res.data?.count ?? selectedIds.length} products`);
              setProducts((prev) =>
                prev.filter((p) => !selectedIds.includes(p.id))
              );
              setSelectedIds([]);
              router.refresh();
            } else {
              toast.error(res.error || "Failed to delete products");
            }
          }
          setConfirmState((s) => ({ ...s, open: false, isLoading: false }));
        }
      );
    } else {
      openConfirm(
        `${action === "publish" ? "Publish" : "Archive"} ${selectedIds.length} products?`,
        action === "publish"
          ? "These products will become visible in your store."
          : "These products will be hidden from your store.",
        async () => {
          setConfirmState((s) => ({ ...s, isLoading: true }));
          const status = action === "publish" ? "ACTIVE" : "ARCHIVED";
          const res = await bulkUpdateProductStatusAction({
            ids: selectedIds,
            status,
          });
          if (res.success) {
            toast.success(
              `Updated ${res.data?.count ?? selectedIds.length} products`
            );
            setProducts((prev) =>
              prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status } : p))
            );
            setSelectedIds([]);
            router.refresh();
          } else {
            toast.error(res.error || "Failed to update products");
          }
          setConfirmState((s) => ({ ...s, open: false, isLoading: false }));
        }
      );
    }
  };

  /** Publish or archive a single product without requiring it to be selected */
  const handleQuickStatusChange = async (
    productId: string,
    status: "ACTIVE" | "ARCHIVED"
  ) => {
    const label = status === "ACTIVE" ? "publish" : "archive";
    const res = await bulkUpdateProductStatusAction({ ids: [productId], status });
    if (res.success) {
      toast.success(
        status === "ACTIVE" ? "Product published!" : "Product archived."
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status } : p))
      );
    } else {
      toast.error(res.error || `Failed to ${label} product`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          {/* BUG FIX: use SearchInput component (has correct pl-9 padding built-in) */}
          <SearchInput
            placeholder="Search products..."
            className="max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                router.push(
                  `/admin/products?search=${encodeURIComponent(searchQuery)}`
                );
              }
            }}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                router.push("/admin/products");
              }}
            >
              Clear
            </Button>
          )}
          {/* Status filter dropdown — updates URL to trigger server re-fetch */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as string);
              const params = new URLSearchParams(window.location.search);
              if (value === "ALL") {
                params.delete("status");
              } else {
                params.set("status", value as string);
              }
              // Reset to page 1 when filter changes
              params.delete("page");
              router.push(`/admin/products?${params.toString()}`);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <>
              <span className="mr-2 text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline">Bulk Actions</Button>}
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkAction("publish")}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    Publish Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("archive")}>
                    <EyeOff className="mr-2 h-4 w-4 text-amber-500" /> Archive
                    Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete")}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/admin/products/new">
              <Button className="bg-slate-900 text-white hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {allSelected && totalCount > products.length && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary">
          <span>
            {selectAllAcrossCatalog
              ? `All ${totalCount} products across the entire catalog are selected.`
              : `All ${products.length} products on this page are selected.`}
          </span>
          {selectAllAcrossCatalog ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-semibold text-primary underline"
              onClick={() => setSelectAllAcrossCatalog(false)}
            >
              Clear catalog selection (select this page only)
            </Button>
          ) : (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-semibold text-primary underline"
              onClick={() => setSelectAllAcrossCatalog(true)}
            >
              Select all {totalCount} products in entire catalog
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border border-border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 pl-4">
                {/* BUG FIX: support indeterminate state */}
                <Checkbox
                  checked={isIndeterminate ? "indeterminate" : allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-foreground/70">Product</TableHead>
              <TableHead className="font-semibold text-foreground/70">Status</TableHead>
              <TableHead className="font-semibold text-foreground/70">Stock</TableHead>
              <TableHead className="font-semibold text-foreground/70">Variants</TableHead>
              <TableHead className="font-semibold text-foreground/70">Price</TableHead>
              <TableHead className="font-semibold text-foreground/70">Category</TableHead>
              <TableHead className="font-semibold text-foreground/70">Added</TableHead>
              <TableHead className="pr-4 text-right font-semibold text-foreground/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const primaryImage = (product as any).media?.find(
                  (m: any) => m.is_primary
                ) ?? (product as any).media?.[0];
                return (
                  <TableRow key={product.id}>
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(product.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* Product thumbnail — bigger, rounder */}
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-slate-50 shadow-sm">
                          {primaryImage?.url ? (
                            <Image
                              src={primaryImage.url}
                              alt={primaryImage.alt_text ?? product.name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                              <Package className="h-5 w-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate max-w-[180px]">
                            {product.name}
                          </span>
                          {product.sku && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {product.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.status === "ACTIVE" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium"
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                          Active
                        </Badge>
                      )}
                      {product.status === "DRAFT" && (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-slate-600 font-medium"
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />
                          Draft
                        </Badge>
                      )}
                      {product.status === "ARCHIVED" && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700 font-medium"
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(product as any).stockQuantity !== undefined ? (
                        (product as any).stockQuantity > 5 ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {(product as any).stockQuantity} in stock
                          </span>
                        ) : (product as any).stockQuantity > 0 ? (
                          <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {(product as any).stockQuantity} low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                            Out of stock
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const vars = (product as any).variants || [];
                          const isSingleDefault =
                            vars.length === 1 &&
                            (!vars[0]?.attributes ||
                              Object.keys(vars[0]?.attributes || {}).length === 0 ||
                              vars[0]?.attributes?.Standard === "Default");
                          if (isSingleDefault || vars.length === 0) {
                            return (
                              <span className="text-xs text-muted-foreground font-medium">Standard</span>
                            );
                          }
                          return (
                            <>
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {vars.length}
                              </span>
                              <span className="text-xs text-muted-foreground">variants</span>
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(product.basePrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {(product as any).category?.name || "Uncategorized"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(product.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-slate-100"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/products/${product.id}/edit`)
                            }
                          >
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(
                                `/products/${product.slug}`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" /> View in Store
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(product.id)}
                            disabled={isDuplicating === product.id}
                          >
                            <Copy className="mr-2 h-4 w-4" />{" "}
                            {isDuplicating === product.id ? "Duplicating…" : "Duplicate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {product.status !== "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => handleQuickStatusChange(product.id, "ACTIVE")}
                              className="text-emerald-600 focus:text-emerald-600"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Publish
                            </DropdownMenuItem>
                          )}
                          {product.status === "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => handleQuickStatusChange(product.id, "ARCHIVED")}
                              className="text-amber-600 focus:text-amber-600"
                            >
                              <EyeOff className="mr-2 h-4 w-4" /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(product.id)}
                            disabled={isDeleting === product.id}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination & Status Footer */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1 text-xs text-muted-foreground">
        <div>
          Showing <strong>{products.length}</strong> of <strong>{totalCount}</strong> products
          {Math.ceil(totalCount / pageSize) > 1 && (
            <span className="ml-1 text-muted-foreground/75">
              (Page {currentPage} of {Math.ceil(totalCount / pageSize)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {selectAllAcrossCatalog ? `All ${totalCount}` : selectedIds.length} selected
            </span>
          )}

          {Math.ceil(totalCount / pageSize) > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", String(currentPage - 1));
                  router.push(`/admin/products?${params.toString()}`);
                }}
                className="h-7 px-2.5 text-xs"
              >
                Previous
              </Button>
              <span className="px-1 text-xs font-medium">
                {currentPage} / {Math.ceil(totalCount / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", String(currentPage + 1));
                  router.push(`/admin/products?${params.toString()}`);
                }}
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* BUG FIX: replaces window.confirm() with proper Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Confirm"
        isLoading={confirmState.isLoading}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
