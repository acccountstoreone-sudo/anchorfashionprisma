"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2, Upload, ImagePlus, X, Loader2, Sparkles, Tag, Boxes, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { InventoryPickerModal } from "@/components/admin/inventory/InventoryPickerModal";
import { InventoryMasterIntakeDialog } from "@/components/admin/inventory/InventoryMasterIntakeDialog";
import { StorefrontLivePreview } from "@/features/admin/components/products/StorefrontLivePreview";
import { InventoryPOSQuickShelf } from "@/features/admin/components/products/InventoryPOSQuickShelf";
import { generateProductCodeAction } from "@/lib/actions/admin/inventory-master.actions";
import { formatVariantSku } from "@/lib/utils/product-code";

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
  getAdminProductByIdAction,
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
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [intakeDefaultCategory, setIntakeDefaultCategory] = useState<string | undefined>(undefined);
  const [intakeRefreshTrigger, setIntakeRefreshTrigger] = useState(0);

  const searchParams = useSearchParams();
  const importId = searchParams ? (searchParams.get("importId") || searchParams.get("inventoryId")) : null;

  const [activeInventoryItem, setActiveInventoryItem] = useState<any>(initialData || null);
  const [linkedProductId, setLinkedProductId] = useState<string | null>(initialData?.id || null);

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSlugCustomized, setIsSlugCustomized] = useState(Boolean(initialData?.slug));

  const handleSelectInventoryProduct = (item: any) => {
    setActiveInventoryItem(item);
    if (item.id) setLinkedProductId(item.id);

    form.setValue("name", item.name, { shouldValidate: true });
    form.setValue("slug", item.slug, { shouldValidate: true });
    if (item.categoryId) form.setValue("categoryId", item.categoryId, { shouldValidate: true });
    if (item.categoryIds && item.categoryIds.length > 0) {
      form.setValue("categoryIds", item.categoryIds, { shouldValidate: true });
    } else if (item.categoryId) {
      form.setValue("categoryIds", [item.categoryId], { shouldValidate: true });
    }
    form.setValue("basePrice", item.basePrice, { shouldValidate: true });
    if (item.costPrice !== undefined && item.costPrice !== null) {
      form.setValue("costPrice", item.costPrice, { shouldValidate: true });
    }
    if (item.sku) form.setValue("sku", item.sku, { shouldValidate: true });
    if (item.barcode) form.setValue("barcode", item.barcode, { shouldValidate: true });
    form.setValue("stockQuantity", item.totalAvailable ?? item.stockQuantity ?? 0, { shouldValidate: true });
    if (item.shortDescription) form.setValue("shortDescription", item.shortDescription, { shouldValidate: true });
    if (item.description) form.setValue("description", item.description, { shouldValidate: true });

    // Populate media if available on inventory style
    if (item.media && item.media.length > 0) {
      const mediaList = item.media.map((m: any, idx: number) => ({
        url: m.url,
        altText: m.altText || item.name,
        displayOrder: idx,
        isPrimary: m.isPrimary ?? idx === 0,
        mediaType: m.mediaType || "IMAGE",
      }));
      form.setValue("media", mediaList, { shouldValidate: true });
    }

    if (item.variants && item.variants.length > 0) {
      const mapped = item.variants.map((v: any, idx: number) => {
        const color = (v.attributes as any)?.Color || v.color || "";
        const size = (v.attributes as any)?.Size || v.size || "";
        return {
          id: v.id,
          sku: v.sku || formatVariantSku(item.sku || "AFPRD", color, size) || `VAR-${idx + 1}`,
          barcode: v.barcode || "",
          priceOverride: v.priceOverride || v.price || item.basePrice,
          costPrice: v.costPrice || v.cost || item.costPrice,
          stockQuantity: v.stockQuantity ?? v.available ?? 0,
          attributes: v.attributes || (color || size ? { Color: color, Size: size } : {}),
          isActive: true,
        };
      });
      form.setValue("variants", mapped, { shouldValidate: true });
    }

    toast.success(`✨ Loaded "${item.name}" (${item.sku}) from inventory! Buy: ৳${item.costPrice} | Sell: ৳${item.basePrice}. Add photos & click "Publish Product" to go live!`);
  };

  useEffect(() => {
    if (!importId || initialData) return;

    let isMounted = true;
    async function loadImportedStyle() {
      try {
        setIsLoading(true);
        const res = await getAdminProductByIdAction({ id: importId! });
        if (isMounted && res.success && res.data) {
          const item = res.data;
          handleSelectInventoryProduct({
            id: item.id,
            name: item.name,
            slug: item.slug,
            categoryId: item.categoryId,
            categoryIds: (item as any).categoryIds,
            basePrice: item.basePrice,
            costPrice: item.costPrice,
            sku: item.sku,
            barcode: item.barcode,
            totalAvailable: item.stockQuantity || 0,
            shortDescription: item.shortDescription,
            description: item.description,
            media: item.media,
            variants: item.variants?.map((v: any) => ({
              id: v.id,
              sku: v.sku,
              barcode: v.barcode,
              available: v.stockQuantity,
              stockQuantity: v.stockQuantity,
              price: v.priceOverride || item.basePrice,
              cost: v.costPrice || item.costPrice,
              attributes: v.attributes,
            })),
          });
        }
      } catch (err) {
        console.error("Failed to load imported product:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadImportedStyle();
    return () => {
      isMounted = false;
    };
  }, [importId, initialData]);

  const handleGenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const name = form.getValues("name") || "";
      const catId = form.getValues("categoryId") || "";
      const brand = brands.find((b) => b.id === form.getValues("brandId"))?.name || "AF";
      const brandPrefix = brand.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2) || "AF";

      const code = await generateProductCodeAction({
        productName: name,
        categoryNameOrId: catId,
        brandPrefix,
      });

      form.setValue("sku", code, { shouldValidate: true });

      // Update variant SKUs
      const currentVariants = form.getValues("variants") || [];
      if (currentVariants.length > 0) {
        const updated = currentVariants.map((v, idx) => {
          const color = (v.attributes as any)?.Color || (v.attributes as any)?.color || "";
          const size = (v.attributes as any)?.Size || (v.attributes as any)?.size || "";
          return {
            ...v,
            sku: formatVariantSku(code, color, size) || `${code}-V${idx + 1}`,
          };
        });
        form.setValue("variants", updated, { shouldValidate: true });
      }

      toast.success(`Generated unique style code: "${code}"!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate style code.");
    } finally {
      setIsGeneratingCode(false);
    }
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

  const totalVariantStock = rawVariants.reduce((sum: number, v: any) => {
    const vStock =
      v.stockQuantity ??
      v.stock_quantity ??
      (Array.isArray(v.inventory_levels)
        ? v.inventory_levels.reduce((s: number, l: any) => s + (l.quantity_available || 0), 0)
        : 0);
    return sum + (Number(vStock) || 0);
  }, 0);

  const normalizedVariants = isDefaultVariantOnly
    ? []
    : rawVariants.map((v: any) => ({
        id: v.id,
        sku: v.sku || "",
        barcode: v.barcode ?? undefined,
        priceOverride: v.price_override ?? v.priceOverride ?? undefined,
        costPrice: v.cost_price ?? v.costPrice ?? undefined,
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
    totalVariantStock > 0
      ? totalVariantStock
      : (initialData as any)?.stockQuantity ??
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
    categoryIds: (initialData as any)?.categoryIds || (initialData as any)?.additionalCategories?.map((c: any) => c.id) || (initialData?.categoryId ? [initialData.categoryId] : []),
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
                costPrice: v.costPrice !== undefined && v.costPrice !== null && (v.costPrice as any) !== "" ? Number(v.costPrice) : null,
                priceOverride: v.priceOverride !== undefined && v.priceOverride !== null && (v.priceOverride as any) !== "" ? Number(v.priceOverride) : null,
                salePrice: v.salePrice !== undefined && v.salePrice !== null && (v.salePrice as any) !== "" ? Number(v.salePrice) : null,
              };
            })
          : [],
    };

    if (status === "ACTIVE") setIsPublishing(true);
    else setIsLoading(true);

    try {
      const targetId = linkedProductId || initialData?.id;
      if (targetId) {
        const res = await updateAdminProductAction({ id: targetId, data });
        if (res.success) {
          toast.success(
            status === "ACTIVE"
              ? "🎉 Product published live to storefront!"
              : status === "DRAFT"
              ? "Saved as inventory draft"
              : "Product updated!"
          );
          router.push(returnPath);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update product");
        }
      } else {
        const res = await createAdminProductAction(data);
        if (res.success) {
          toast.success(
            status === "ACTIVE"
              ? "🎉 Product published live to storefront!"
              : status === "DRAFT"
              ? "Product created as draft"
              : "Product created!"
          );
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

        {/* Clothing POS Inventory Master Rack */}
        <InventoryPOSQuickShelf
          onSelectItem={handleSelectInventoryProduct}
          activeItem={activeInventoryItem}
          onOpenFullModal={() => setPickerOpen(true)}
          categories={categories}
          selectedCategoryId={form.watch("categoryId") || undefined}
          onSelectCategory={(catId) =>
            form.setValue("categoryId", catId === "ALL" ? "" : catId, { shouldValidate: true })
          }
          onOpenIntakeDialog={(catId) => {
            setIntakeDefaultCategory(catId || form.getValues("categoryId") || undefined);
            setIntakeModalOpen(true);
          }}
          refreshTrigger={intakeRefreshTrigger}
        />

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
                          onChange={(e) => {
                            field.onChange(e);
                            if (!isSlugCustomized) {
                              const autoSlug = e.target.value
                                .toLowerCase()
                                .trim()
                                .replace(/[^\w\s-]/g, "")
                                .replace(/\s+/g, "-");
                              form.setValue("slug", autoSlug, { shouldValidate: true });
                            }
                          }}
                          onBlur={() => {
                            field.onBlur();
                            const currentSku = form.getValues("sku");
                            const currentCat = form.getValues("categoryId");
                            if (!currentSku && currentCat && field.value?.trim()) {
                              handleGenerateCode();
                            }
                          }}
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
                        <div className="flex items-center justify-between">
                          <FormLabel>Slug</FormLabel>
                          <span className="text-[10px] text-muted-foreground font-medium">Auto-generated from name</span>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="navy-blue-silk-tie"
                            {...field}
                            onChange={(e) => {
                              setIsSlugCustomized(true);
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormDescription>The URL friendly identifier</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <FormLabel className="text-xs font-semibold">Style Code / Short SKU</FormLabel>
                            {field.value && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-mono py-0 px-1.5">
                                ✓ Unique
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer gap-1 font-semibold"
                            onClick={handleGenerateCode}
                            disabled={isGeneratingCode}
                          >
                            {isGeneratingCode ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Auto-Generate (AFPTS1)
                          </Button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="e.g. AFPTS1"
                              {...field}
                              value={field.value || ""}
                              className="pl-8 font-mono font-bold tracking-wider text-sm bg-background border-border/80"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          Unique fashion style code (e.g. AFPTS1) displayed on the live website, PDP badge, cart, and invoices.
                        </FormDescription>
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
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                      {/* Name/Color — stored as attributes */}
                      <FormField
                        control={form.control}
                        name={`variants.${index}.attributes`}
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">Color / Size</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Black / XL"
                                value={
                                  field.value
                                    ? Object.entries(field.value as Record<string, string>)
                                        .map(([_, v]) => `${v}`)
                                        .join(" / ") || ""
                                    : ""
                                }
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
                              <Input placeholder="AFPTS1-BLK-M" {...field} className="h-8 text-sm font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.barcode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Barcode (EAN-13)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="89420..."
                                {...field}
                                value={field.value || ""}
                                className="h-8 text-sm font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.costPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Buy Price ({CURRENCY_SYMBOL})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                }
                                className="h-8 text-sm"
                              />
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
                            <FormLabel className="text-xs">Sell Price ({CURRENCY_SYMBOL})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                }
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
                                className="h-8 text-sm font-semibold"
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
            {/* Real-time Storefront Live Preview Card */}
            <StorefrontLivePreview
              name={form.watch("name") || ""}
              categoryName={categories.find((c) => c.id === form.watch("categoryId"))?.name}
              brandName={brands.find((b) => b.id === form.watch("brandId"))?.name}
              sku={form.watch("sku") || ""}
              basePrice={Number(form.watch("basePrice")) || 0}
              salePrice={form.watch("salePrice")}
              costPrice={form.watch("costPrice")}
              media={form.watch("media") || []}
              variants={form.watch("variants") || []}
              status={form.watch("status") || "DRAFT"}
            />

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

                {/* Live Profit Margin Intelligence Indicator */}
                {(() => {
                  const base = Number(form.watch("basePrice")) || 0;
                  const cost = Number(form.watch("costPrice")) || 0;
                  const profit = base - cost;
                  const margin = base > 0 ? Math.round((profit / base) * 100) : 0;
                  if (base > 0 && cost > 0) {
                    return (
                      <div className="rounded-lg bg-emerald-50/80 border border-emerald-200/80 p-3 text-xs text-emerald-950 flex items-center justify-between shadow-xs">
                        <div>
                          <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Unit Gross Profit</p>
                          <p className="font-bold text-sm text-emerald-900">+৳{profit.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Margin</p>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                            {margin}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

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
                          onValueChange={(val) => {
                            field.onChange(val);
                            const currentSku = form.getValues("sku");
                            const currentName = form.getValues("name");
                            if (!currentSku && currentName?.trim()) {
                              setTimeout(() => handleGenerateCode(), 100);
                            }
                          }}
                          items={categories.map((c) => ({ value: c.id, label: c.name }))}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background/90 text-sm">
                              <SelectValue placeholder="Select a category">
                                {selectedCategory?.name}
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
                  name="categoryIds"
                  render={({ field }) => {
                    const selectedIds: string[] = field.value || [];
                    const primaryId = form.watch("categoryId");

                    const toggleCategory = (catId: string) => {
                      if (catId === primaryId) return; // Primary is always included
                      const next = selectedIds.includes(catId)
                        ? selectedIds.filter((id) => id !== catId)
                        : [...selectedIds, catId];
                      field.onChange(next);
                    };

                    const secondarySelected = selectedIds.filter((id) => id !== primaryId);

                    return (
                      <FormItem className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-primary" />
                            Additional Categories (Multiple)
                          </FormLabel>
                          <span className="text-[11px] text-muted-foreground">
                            {secondarySelected.length} secondary selected
                          </span>
                        </div>
                        <FormDescription className="text-xs">
                          Tag this product into multiple collections (e.g. Men, Eid Collection, Festive Wear) so it appears across all matching categories.
                        </FormDescription>

                        {/* Selected Categories Badges */}
                        <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-lg border border-border/60 bg-muted/20 items-center">
                          {primaryId && (
                            <Badge variant="default" className="gap-1 bg-primary text-primary-foreground text-xs shadow-xs font-medium">
                              <span className="text-[10px] uppercase font-bold opacity-75">Primary:</span>
                              {categories.find((c) => c.id === primaryId)?.name || "Primary Category"}
                            </Badge>
                          )}
                          {secondarySelected.map((catId) => {
                            const cat = categories.find((c) => c.id === catId);
                            if (!cat) return null;
                            return (
                              <Badge
                                key={cat.id}
                                variant="secondary"
                                className="gap-1 text-xs bg-secondary/80 hover:bg-secondary border border-border/40 pl-2 pr-1 py-0.5 transition-all"
                              >
                                <span>{cat.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleCategory(cat.id);
                                  }}
                                  className="p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
                                  aria-label={`Remove ${cat.name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          {!primaryId && secondarySelected.length === 0 && (
                            <span className="text-xs text-muted-foreground/60 italic py-0.5">
                              Select primary category above, then click additional categories below.
                            </span>
                          )}
                        </div>

                        {/* Quick Add Available Categories */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-medium text-muted-foreground">Click to add/remove:</span>
                          <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 rounded-md border border-border/40 bg-background/50">
                            {categories
                              .filter((c) => c.id !== primaryId)
                              .map((c) => {
                                const isSelected = selectedIds.includes(c.id);
                                return (
                                  <button
                                    type="button"
                                    key={c.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleCategory(c.id);
                                    }}
                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-all ${
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                                        : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground"
                                    }`}
                                  >
                                    <span>{isSelected ? "✓" : "+"}</span>
                                    <span>{c.name}</span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
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
        categories={categories}
      />

      {/* Intake directly into Inventory Modal */}
      <InventoryMasterIntakeDialog
        open={intakeModalOpen}
        onOpenChange={setIntakeModalOpen}
        categories={categories}
        defaultCategoryId={intakeDefaultCategory}
        onSuccess={(created) => {
          setIntakeRefreshTrigger((prev) => prev + 1);
          if (created) {
            const prod = created.product || created;
            const mappedItem = {
              id: prod.id,
              name: prod.name,
              slug: prod.slug,
              sku: prod.sku,
              barcode: prod.barcode,
              categoryId: prod.categoryId,
              basePrice: Number(prod.basePrice || 0),
              costPrice: Number(prod.costPrice || 0),
              totalAvailable: created.totalStockUnits || 0,
              variants: created.variants || prod.variants || [],
            };
            handleSelectInventoryProduct(mappedItem);
          }
        }}
      />
    </Form>
  );
}
