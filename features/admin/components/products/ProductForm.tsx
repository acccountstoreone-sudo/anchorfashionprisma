"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2, Upload, ImagePlus, X, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { InventoryPickerModal } from "@/components/admin/inventory/InventoryPickerModal";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CreateProductSchema, Product } from "@/types/catalog.types";
import {
  createAdminProductAction,
  updateAdminProductAction,
  getCategoriesAction,
  getBrandsAction,
  getTagsAction,
} from "@/lib/actions/admin/products.actions";
import { uploadImageAction } from "@/lib/actions/upload.actions";

// Currency symbol — BDT (Bangladesh Taka). Change via Admin Settings → Store.
const CURRENCY_SYMBOL = "৳";

type ProductFormValues = z.infer<typeof CreateProductSchema>;

interface CategoryOption {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
}

interface BrandOption {
  id: string;
  name: string;
  slug?: string;
}

interface TagOption {
  id: string;
  name: string;
  slug?: string;
}

interface ProductFormProps {
  initialData?: Product;
  /** Where to navigate after a successful create or update. Defaults to /admin/products */
  returnPath?: string;
}

export function ProductForm({ initialData, returnPath = "/admin/products" }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelectInventoryProduct = (item: any) => {
    if (item.id) {
      toast.success(`Opening "${item.name}" from inventory. Add description, images, and click Publish!`);
      router.push(`/admin/products/${item.id}/edit`);
      return;
    }

    form.setValue("name", item.name, { shouldValidate: true });
    form.setValue("slug", item.slug, { shouldValidate: true });
    if (item.categoryId) form.setValue("categoryId", item.categoryId, { shouldValidate: true });
    form.setValue("basePrice", item.basePrice, { shouldValidate: true });
    if (item.costPrice !== undefined) form.setValue("costPrice", item.costPrice, { shouldValidate: true });
    if (item.sku) form.setValue("sku", item.sku, { shouldValidate: true });
    if (item.barcode) form.setValue("barcode", item.barcode, { shouldValidate: true });
    form.setValue("stockQuantity", item.totalAvailable || 0, { shouldValidate: true });

    if (item.variants && item.variants.length > 0) {
      const mapped = item.variants.map((v: any) => ({
        sku: v.sku,
        barcode: v.barcode || "",
        priceOverride: v.price || item.basePrice,
        costPrice: v.cost || item.costPrice,
        stockQuantity: v.available || 0,
        attributes: v.attributes || {},
        isActive: true,
      }));
      form.setValue("variants", mapped, { shouldValidate: true });
    }

    toast.success(`Loaded "${item.name}" from inventory with ${item.variantCount || item.variants?.length || 0} variants! Add description, images, and click Publish.`);
  };

  useEffect(() => {
    async function loadData() {
      const [catsRes, brandsRes, tagsRes] = await Promise.all([
        getCategoriesAction({}),
        getBrandsAction({}),
        getTagsAction({}),
      ]);
      if (catsRes.success && catsRes.data) setCategories(catsRes.data);
      if (brandsRes.success && brandsRes.data) setBrands(brandsRes.data);
      if (tagsRes.success && tagsRes.data) setTags(tagsRes.data);
    }
    loadData();
  }, []);

  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingImage(index);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "products");
      formData.append("folder", "product-images");

      const res = await uploadImageAction(formData);

      if (res.success && res.url) {
        form.setValue(`media.${index}.url`, res.url);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(res.error || "Failed to upload image");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files);
      setUploadingImage(999);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "products");
        formData.append("folder", "product-images");

        const res = await uploadImageAction(formData);
        if (res.success && res.url) {
          appendMedia({
            url: res.url,
            altText: file.name.replace(/\.[^/.]+$/, ""),
            displayOrder: mediaFields.length + i,
            isPrimary: mediaFields.length === 0 && i === 0,
            mediaType: "IMAGE",
          });
        } else {
          toast.error(res.error || `Failed to upload ${file.name}`);
        }
      }
      toast.success("Image(s) uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image(s)");
    } finally {
      setUploadingImage(null);
      if (e.target) e.target.value = "";
    }
  };

  // Normalize DB snake_case → camelCase for edit mode (media, variants, seo)
  const normalizedMedia = (initialData?.media || []).map((m: any) => ({
    url: m.url || "",
    altText: m.alt_text ?? m.altText ?? "",
    displayOrder: m.display_order ?? m.displayOrder ?? 0,
    isPrimary: m.is_primary ?? m.isPrimary ?? false,
    mediaType: m.media_type ?? m.mediaType ?? "IMAGE",
  }));

  const rawVariants = (initialData as any)?.variants || [];
  const isDefaultVariantOnly =
    rawVariants.length === 1 &&
    (!rawVariants[0]?.attributes ||
      Object.keys(rawVariants[0]?.attributes || {}).length === 0 ||
      rawVariants[0]?.attributes?.Standard === "Default");

  const normalizedVariants = isDefaultVariantOnly
    ? []
    : rawVariants.map((v: any) => ({
        sku: v.sku || "",
        barcode: v.barcode ?? undefined,
        priceOverride: v.price_override ?? v.priceOverride ?? undefined,
        salePrice: v.sale_price ?? v.salePrice ?? undefined,
        isActive: v.is_active ?? v.isActive ?? true,
        attributes: v.attributes || {},
        stockQuantity:
          v.stockQuantity ??
          v.stock_quantity ??
          (Array.isArray(v.inventory_levels)
            ? v.inventory_levels.reduce((s: number, l: any) => s + (l.quantity_available || 0), 0)
            : 0),
      }));

  const initialStock =
    (initialData as any)?.stockQuantity ??
    (initialData as any)?.stock_quantity ??
    (isDefaultVariantOnly && rawVariants[0]
      ? rawVariants[0].stockQuantity ??
        (Array.isArray(rawVariants[0].inventory_levels)
          ? rawVariants[0].inventory_levels.reduce(
              (s: number, l: any) => s + (l.quantity_available || 0),
              0
            )
          : 0)
      : 0);

  const normalizedSeo = initialData?.seo
    ? {
        metaTitle: (initialData.seo as any).meta_title ?? (initialData.seo as any).metaTitle ?? "",
        metaDescription: (initialData.seo as any).meta_description ?? (initialData.seo as any).metaDescription ?? "",
        keywords: (initialData.seo as any).keywords ?? [],
      }
    : { metaTitle: "", metaDescription: "", keywords: [] };

  const defaultValues: Partial<ProductFormValues> = {
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    shortDescription: initialData?.shortDescription || "",
    description: initialData?.description || "",
    basePrice: initialData?.basePrice || 0,
    costPrice: initialData?.costPrice ?? undefined,
    salePrice: initialData?.salePrice ?? undefined,
    stockQuantity: initialStock,
    sku: initialData?.sku || "",
    barcode: initialData?.barcode || "",
    status: initialData?.status || "ACTIVE",
    categoryId: initialData?.categoryId || "",
    brandId: initialData?.brandId || "",
    isFeatured: initialData?.isFeatured || false,
    variants: normalizedVariants,
    media: normalizedMedia,
    seo: normalizedSeo,
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(CreateProductSchema),
    defaultValues,
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const {
    fields: mediaFields,
    append: appendMedia,
    remove: removeMedia,
  } = useFieldArray({
    control: form.control,
    name: "media",
  });

  const submitWithStatus = async (statusOverride?: "DRAFT" | "ACTIVE" | "ARCHIVED") => {
    // If slug is empty, auto-generate from name
    const currentName = form.getValues("name")?.trim();
    const currentSlug = form.getValues("slug")?.trim();
    if (!currentSlug && currentName) {
      const generatedSlug = currentName
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      form.setValue("slug", generatedSlug);
    }

    const currentCat = form.getValues("categoryId");
    if (!currentCat || currentCat === "") {
      toast.error("Please select a category for the product.");
      return;
    }

    const valid = await form.trigger();
    if (!valid) {
      toast.error("Please fix the form errors before saving.");
      return;
    }

    const rawValues = form.getValues();
    const status = statusOverride || (rawValues.status as "DRAFT" | "ACTIVE" | "ARCHIVED") || "ACTIVE";
    const data = {
      ...rawValues,
      stockQuantity: Number(rawValues.stockQuantity ?? 0),
      status,
      brandId: rawValues.brandId && rawValues.brandId !== "" && rawValues.brandId !== "none" ? rawValues.brandId : null,
      categoryId: rawValues.categoryId,
      barcode: rawValues.barcode && rawValues.barcode.trim() !== "" ? rawValues.barcode.trim() : null,
      sku: rawValues.sku && rawValues.sku.trim() !== "" ? rawValues.sku.trim() : null,
      variants:
        (rawValues.variants || []).length > 0
          ? rawValues.variants?.map((v, idx) => {
              const currentSlug = form.getValues("slug")?.trim() || form.getValues("name")?.trim() || "PROD";
              const cleanPrefix = currentSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
              const fallbackSku = `${cleanPrefix}-V${idx + 1}-${Date.now().toString().slice(-3)}`;
              return {
                ...v,
                stockQuantity: Number(v.stockQuantity ?? 0),
                barcode: v.barcode && v.barcode.trim() !== "" ? v.barcode.trim() : null,
                sku: v.sku?.trim() || fallbackSku,
              };
            })
          : [],
    };

    if (status === "ACTIVE") setIsPublishing(true);
    else setIsLoading(true);

    try {
      if (initialData) {
        const res = await updateAdminProductAction({ id: initialData.id, data });
        if (res.success) {
          toast.success(status === "ACTIVE" ? "Product published!" : status === "DRAFT" ? "Saved as draft" : "Product updated!");
          router.push(returnPath);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update product");
        }
      } else {
        const res = await createAdminProductAction(data);
        if (res.success) {
          toast.success(status === "ACTIVE" ? "Product published!" : status === "DRAFT" ? "Product created as draft" : "Product created!");
          router.push(returnPath);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to create product");
        }
      }
    } finally {
      setIsLoading(false);
      setIsPublishing(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    await submitWithStatus(data.status as "DRAFT" | "ACTIVE" | "ARCHIVED");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-border/50">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {initialData ? "Edit Product" : "Create Product"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {initialData ? `Editing: ${initialData.name}` : "Add a new product to your catalog"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(returnPath)}
              disabled={isLoading || isPublishing}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submitWithStatus("DRAFT")}
              disabled={isLoading || isPublishing}
              className="cursor-pointer"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
              onClick={() => submitWithStatus("ACTIVE")}
              disabled={isLoading || isPublishing}
            >
              {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPublishing ? "Publishing..." : "Publish Product"}
            </Button>
          </div>
        </div>

        {/* Load from Inventory Master Quick Banner */}
        {!initialData && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-sm text-foreground">
                  Already added this item into Inventory? (ইনভেন্টরি থেকে দ্রুত লোড করুন)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Load colors, sizes, barcodes, SKU, and stock counts directly from your Inventory intake in 1-click.
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white shrink-0 gap-1.5 shadow-sm cursor-pointer"
              onClick={() => setPickerOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Select from Inventory
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3 pb-8">
          {/* Main Info Column */}
          <div className="space-y-6 md:col-span-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. Navy Blue Silk Tie"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="navy-blue-silk-tie" {...field} />
                        </FormControl>
                        <FormDescription>The URL friendly name</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="TIE-NVY-SLK"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A brief summary for cards and listings..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[120px]"
                          placeholder="Detailed product description..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Product Images</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload photos. First image shown as thumbnail.
                  </p>
                </div>
                <label className="cursor-pointer">
                  <div className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                    {uploadingImage !== null ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>{uploadingImage !== null ? "Uploading..." : "Add Images"}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleDirectUpload}
                    disabled={uploadingImage !== null}
                  />
                </label>
              </CardHeader>
              <CardContent className="space-y-4">
                {mediaFields.map((field, index) => {
                  const currentUrl = form.watch(`media.${index}.url`);
                  return (
                    <div key={field.id} className="rounded-lg border bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-start gap-4">
                        {/* Preview thumbnail */}
                        <div className="h-20 w-20 shrink-0 rounded-md border bg-white overflow-hidden flex items-center justify-center">
                          {currentUrl ? (
                            <img
                              src={currentUrl}
                              alt={form.watch(`media.${index}.altText`) || `Image ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-slate-300">
                              <Upload className="h-6 w-6" />
                              <span className="text-[10px] mt-1">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          {/* Upload label */}
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">
                              {index === 0 ? "Primary Image" : `Image ${index + 1}`}
                              {index === 0 && (
                                <Badge variant="outline" className="ml-2 text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">Main</Badge>
                              )}
                            </p>
                            <label className="cursor-pointer block">
                              <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors">
                                {uploadingImage === index ? (
                                  <><Loader2 className="h-4 w-4 animate-spin text-slate-400" /><span>Uploading...</span></>
                                ) : (
                                  <><Upload className="h-4 w-4 text-slate-400" /><span>{currentUrl ? "Replace Image" : "Upload Image"}</span></>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, index)}
                                disabled={uploadingImage !== null}
                              />
                            </label>
                            {/* Hidden field stores the Supabase public URL */}
                            <FormField
                              control={form.control}
                              name={`media.${index}.url`}
                              render={({ field }) => (
                                <FormItem className="hidden"><FormControl><input type="hidden" {...field} /></FormControl></FormItem>
                              )}
                            />
                          </div>
                          {/* Alt Text */}
                          <FormField
                            control={form.control}
                            name={`media.${index}.altText`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-slate-600">Alt Text</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Describe this image for accessibility..."
                                    {...field}
                                    value={field.value || ""}
                                    className="h-8 text-sm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {/* Controls */}
                        <div className="flex flex-col items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMedia(index)}
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <FormField
                            control={form.control}
                            name={`media.${index}.isPrimary`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col items-center gap-1">
                                <FormLabel className="text-[10px] text-slate-500">Primary</FormLabel>
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {mediaFields.length === 0 && (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-10 text-center hover:border-slate-300 hover:bg-slate-50/50 transition-colors">
                    {uploadingImage !== null ? (
                      <>
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">Uploading image(s)...</p>
                        <p className="mt-1 text-xs text-slate-400">Processing file, please wait.</p>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">Add Product Images</p>
                        <p className="mt-1 text-xs text-slate-400">Click to upload. PNG, JPG, WEBP supported.</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleDirectUpload}
                      disabled={uploadingImage !== null}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Product Variants</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Add sizes, colors, or other variants.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentSlug = form.getValues("slug")?.trim() || form.getValues("name")?.trim() || "PROD";
                    const cleanPrefix = currentSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                    appendVariant({
                      sku: `${cleanPrefix}-V${variantFields.length + 1}`,
                      isActive: true,
                      attributes: {},
                      stockQuantity: 0,
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Variant
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {variantFields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Variant {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        className="h-7 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                      {/* Name/Color — stored as attributes.Color */}
                      <FormField
                        control={form.control}
                        name={`variants.${index}.attributes`}
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">Name / Color</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Black, Red, XL"
                                value={field.value ? Object.values(field.value as Record<string, string>)[0] || "" : ""}
                                onChange={(e) => field.onChange({ Color: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.sku`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Variant SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="SKU-BLK-M" {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.priceOverride`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Price ({CURRENCY_SYMBOL})</FormLabel>
                            <FormControl>
                              <Input
                                type="number" step="0.01" placeholder="0.00"
                                {...field} value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-8 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.salePrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Sale Price ({CURRENCY_SYMBOL})</FormLabel>
                            <FormControl>
                              <Input
                                type="number" step="0.01" placeholder="0.00"
                                {...field} value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-8 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.stockQuantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Stock (Qty)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                                value={field.value ?? 0}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                className="h-8 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                {variantFields.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No variants yet. Click &quot;Add Variant&quot; to add sizes, colors, etc.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  Search Engine Optimization (SEO)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="seo.metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SEO Title"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seo.metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="SEO Description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sell Price */}
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sell Price ({CURRENCY_SYMBOL}) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>The price customers pay</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Buy / Cost Price */}
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buy Price / Cost ({CURRENCY_SYMBOL})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Your purchase cost (not shown to customers)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sale / Discount Price */}
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale / Discount Price ({CURRENCY_SYMBOL})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00 (optional)"
                            className="pl-8"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Discounted price shown to customers (optional)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Inventory & Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {variantFields.length > 0
                          ? "Default stock level. When variants are defined, each variant's stock is controlled individually in the variants section."
                          : "Available stock quantity. Set to 0 to mark as Out of Stock."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Status & Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        items={[
                          { value: "DRAFT", label: "Draft" },
                          { value: "ACTIVE", label: "Active" },
                          { value: "ARCHIVED", label: "Archived" },
                        ]}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status">
                              {field.value === "ACTIVE"
                                ? "Active"
                                : field.value === "DRAFT"
                                ? "Draft"
                                : field.value === "ARCHIVED"
                                ? "Archived"
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Show on homepage</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => {
                    const selectedCategory = categories.find((cat) => cat.id === field.value);
                    return (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          items={categories.map((cat) => ({
                            value: cat.id,
                            label: cat.name,
                          }))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category">
                                {selectedCategory ? selectedCategory.name : undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => {
                    const selectedBrand = brands.find((brand) => brand.id === field.value);
                    const brandDisplayValue =
                      field.value === "none" || !field.value
                        ? field.value === "none"
                          ? "No Brand"
                          : undefined
                        : selectedBrand
                        ? selectedBrand.name
                        : undefined;

                    return (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <Select
                          onValueChange={(val) =>
                            field.onChange(val === "none" ? "" : val)
                          }
                          value={field.value || "none"}
                          items={[
                            { value: "none", label: "No Brand" },
                            ...brands.map((brand) => ({
                              value: brand.id,
                              label: brand.name,
                            })),
                          ]}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a brand">
                                {brandDisplayValue}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Brand</SelectItem>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Quick help tips */}
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-600">💡 Tips</p>
              <p>• <strong>Save Draft</strong> — save without publishing</p>
              <p>• <strong>Publish</strong> — make live in store immediately</p>
              <p>• Use variants for different sizes/colors</p>
              <p>• Add alt text for better SEO &amp; accessibility</p>
            </div>
          </div>
        </div>
      </form>

      {/* Select from Inventory Master Modal */}
      <InventoryPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectProduct={handleSelectInventoryProduct}
      />
    </Form>
  );
}
