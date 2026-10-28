"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  Plus,
  Trash2,
  Upload,
  ImagePlus,
  X,
  Loader2,
  Sparkles,
  Tag,
  Boxes,
  CheckCircle2,
  Printer,
  Wand2,
  Layers,
  Percent,
  TrendingUp,
  Barcode as BarcodeIcon,
  Calculator,
  ArrowLeft,
  SlidersHorizontal,
  AlertCircle,
  FileText,
  FolderTree,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InventoryPickerModal } from "@/components/admin/inventory/InventoryPickerModal";
import { InventoryMasterIntakeDialog } from "@/components/admin/inventory/InventoryMasterIntakeDialog";
import { StorefrontLivePreview } from "@/features/admin/components/products/StorefrontLivePreview";
import { InventoryPOSQuickShelf } from "@/features/admin/components/products/InventoryPOSQuickShelf";
import { CategoryHierarchySelector } from "@/features/admin/components/catalog/CategoryHierarchySelector";
import { PrintBarcodeModal, BarcodeLabelData } from "@/components/admin/inventory/PrintBarcodeModal";
import { generateProductCodeAction } from "@/lib/actions/admin/inventory-master.actions";
import { formatVariantSku, APPAREL_SIZE_SYSTEMS, detectApparelSystemForCategory } from "@/lib/utils/product-code";
import { generateEAN13Sync } from "@/lib/utils/barcode";
import { getWarehouses } from "@/app/actions/admin/procurement.actions";
import { useAdminBreadcrumbStore } from "@/stores/useAdminBreadcrumbStore";

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
  parent_id?: string | null;
  parent?: { id: string; name: string } | null;
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
  const setDynamicSegmentName = useAdminBreadcrumbStore((state) => state.setDynamicSegmentName);

  useEffect(() => {
    if (initialData?.id && initialData?.name) {
      setDynamicSegmentName(initialData.id, initialData.name);
    }
  }, [initialData, setDynamicSegmentName]);

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

  // Single vs Variable Product mode
  const [productType, setProductType] = useState<"SINGLE" | "VARIABLE">(() => {
    return (initialData?.variants && initialData.variants.length > 1) ? "VARIABLE" : "SINGLE";
  });

  // Profit Margin % for pricing calculator
  const [marginPercent, setMarginPercent] = useState<number | string>(() => {
    const sell = Number(initialData?.basePrice) || 0;
    const cost = Number(initialData?.costPrice) || 0;
    if (sell > 0 && cost > 0) {
      return Math.round(((sell - cost) / cost) * 100);
    }
    return 35;
  });

  // Warehouses & Stock Allocation
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [alertQuantity, setAlertQuantity] = useState<number>(5);

  // Barcode Label Print Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Quick Variant Matrix Generator state (Variable Product Mode)
  const [matrixColors, setMatrixColors] = useState<string[]>(["Black", "Navy Blue", "White"]);
  const [matrixSizes, setMatrixSizes] = useState<string[]>(["M", "L", "XL"]);
  const [customColorInput, setCustomColorInput] = useState("");
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [bulkSellPrice, setBulkSellPrice] = useState<string>("");
  const [bulkCostPrice, setBulkCostPrice] = useState<string>("");
  const [bulkStock, setBulkStock] = useState<string>("");

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
      const [catsRes, brandsRes, tagsRes, whRes] = await Promise.all([
        getCategoriesAction({}),
        getBrandsAction({}),
        getTagsAction({}),
        getWarehouses(),
      ]);
      if (catsRes.success && catsRes.data) setCategories(catsRes.data);
      if (brandsRes.success && brandsRes.data) setBrands(brandsRes.data);
      if (tagsRes.success && tagsRes.data) setTags(tagsRes.data);
      if (whRes.success && whRes.data && whRes.data.length > 0) {
        setWarehouses(whRes.data);
        setSelectedWarehouseId(whRes.data[0].id);
      }
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

  // Barcode Label items for PrintBarcodeModal
  const barcodePrintItems: BarcodeLabelData[] = useMemo(() => {
    const name = form.watch("name") || "Product";
    const baseSku = form.watch("sku") || "SKU";
    const baseBarcode = form.watch("barcode") || "";
    const basePrice = Number(form.watch("basePrice")) || 0;
    const variants = form.watch("variants") || [];

    if (productType === "VARIABLE" && variants.length > 0) {
      return variants.map((v) => {
        const color = (v.attributes as any)?.Color || "";
        const size = (v.attributes as any)?.Size || "";
        const attrStr = [color, size].filter(Boolean).join(" - ");
        return {
          productName: attrStr ? `${name} (${attrStr})` : name,
          sku: v.sku || baseSku,
          barcode: v.barcode || baseBarcode || v.sku || baseSku,
          price: Number(v.priceOverride ?? basePrice),
          quantity: Math.max(1, Number(v.stockQuantity) || 1),
        };
      });
    }

    return [
      {
        productName: name,
        sku: baseSku,
        barcode: baseBarcode || baseSku,
        price: basePrice,
        quantity: Math.max(1, Number(form.watch("stockQuantity")) || 1),
      },
    ];
  }, [
    form.watch("name"),
    form.watch("sku"),
    form.watch("barcode"),
    form.watch("basePrice"),
    form.watch("variants"),
    form.watch("stockQuantity"),
    productType,
  ]);

  // Quick Matrix Generator helper
  const handleGenerateVariantMatrix = () => {
    if (matrixColors.length === 0 && matrixSizes.length === 0) {
      toast.error("Please select at least one Color or Size to generate variations.");
      return;
    }

    const currentSku = form.getValues("sku")?.trim() || form.getValues("name")?.trim() || "AFPRD";
    const cleanPrefix = currentSku.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const baseCost = form.getValues("costPrice") ?? undefined;
    const basePrice = form.getValues("basePrice") ?? undefined;

    const colors = matrixColors.length > 0 ? matrixColors : ["Standard"];
    const sizes = matrixSizes.length > 0 ? matrixSizes : ["One Size"];

    const newVariants: any[] = [];

    for (const c of colors) {
      for (const s of sizes) {
        const colorAttr = c === "Standard" ? undefined : c;
        const sizeAttr = s === "One Size" ? undefined : s;
        const attributes: Record<string, string> = {};
        if (colorAttr) attributes.Color = colorAttr;
        if (sizeAttr) attributes.Size = sizeAttr;

        const varSku = formatVariantSku(cleanPrefix, colorAttr || "", sizeAttr || "") || `${cleanPrefix}-${c.slice(0, 3)}-${s}`.toUpperCase();
        const varBarcode = generateEAN13Sync();

        newVariants.push({
          sku: varSku,
          barcode: varBarcode,
          priceOverride: basePrice,
          costPrice: baseCost,
          stockQuantity: 0,
          attributes,
          isActive: true,
        });
      }
    }

    form.setValue("variants", newVariants, { shouldValidate: true });
    toast.success(`Generated ${newVariants.length} variations with unique SKUs and EAN-13 barcodes!`);
  };

  const handleGenerateAllVariantBarcodes = () => {
    const current = form.getValues("variants") || [];
    if (current.length === 0) {
      toast.error("No variants to generate barcodes for.");
      return;
    }
    const updated = current.map((v) => ({
      ...v,
      barcode: generateEAN13Sync(),
    }));
    form.setValue("variants", updated, { shouldValidate: true });
    toast.success(`Generated standard EAN-13 barcodes for all ${updated.length} variants!`);
  };

  const handleBulkApplyToVariants = (type: "price" | "cost" | "stock") => {
    const current = form.getValues("variants") || [];
    if (current.length === 0) {
      toast.error("No variants to apply to.");
      return;
    }

    if (type === "price") {
      const val = parseFloat(bulkSellPrice);
      if (isNaN(val)) return toast.error("Enter a valid sell price.");
      form.setValue("variants", current.map(v => ({ ...v, priceOverride: val })), { shouldValidate: true });
      toast.success(`Applied ৳${val} sell price to all ${current.length} variants.`);
    } else if (type === "cost") {
      const val = parseFloat(bulkCostPrice);
      if (isNaN(val)) return toast.error("Enter a valid buy price.");
      form.setValue("variants", current.map(v => ({ ...v, costPrice: val })), { shouldValidate: true });
      toast.success(`Applied ৳${val} buy price to all ${current.length} variants.`);
    } else if (type === "stock") {
      const val = parseInt(bulkStock, 10);
      if (isNaN(val)) return toast.error("Enter a valid stock quantity.");
      form.setValue("variants", current.map(v => ({ ...v, stockQuantity: val })), { shouldValidate: true });
      toast.success(`Applied ${val} opening stock to all ${current.length} variants.`);
    }
  };

  const submitWithStatus = async (statusOverride?: "DRAFT" | "ACTIVE" | "ARCHIVED") => {
    // ENFORCE INVENTORY-FIRST POLICY
    // A catalog product CANNOT be added without selecting an inventory product first!
    const isEditMode = Boolean(initialData?.id);
    const hasLinkedInventory = Boolean(linkedProductId || activeInventoryItem?.id);

    if (!isEditMode && !hasLinkedInventory) {
      toast.error(
        "❌ Inventory product required! You cannot add a product without selecting an inventory product first. Please select an item from Inventory."
      );
      setPickerOpen(true);
      return;
    }

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
      toast.error("Please select at least one primary category for the product.");
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
      status,
      brandId: rawValues.brandId && rawValues.brandId !== "" && rawValues.brandId !== "none" ? rawValues.brandId : null,
      categoryId: rawValues.categoryId,
      categoryIds: Array.from(
        new Set([rawValues.categoryId, ...(rawValues.categoryIds || [])].filter((c): c is string => Boolean(c) && typeof c === "string"))
      ),
      barcode: rawValues.barcode && rawValues.barcode.trim() !== "" ? rawValues.barcode.trim() : null,
      sku: rawValues.sku && rawValues.sku.trim() !== "" ? rawValues.sku.trim() : null,
      warehouseId: selectedWarehouseId || (rawValues as any).warehouseId || null,
      alertQuantity: Number(alertQuantity || (rawValues as any).alertQuantity || 5),
      stockQuantity:
        productType === "VARIABLE" && (rawValues.variants || []).length > 0
          ? (rawValues.variants ?? []).reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0)
          : Number(rawValues.stockQuantity ?? 0),
      variants:
        productType === "VARIABLE" && (rawValues.variants || []).length > 0
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
        toast.error("Inventory item required! Please select an inventory product first.");
        setPickerOpen(true);
      }
    } finally {
      setIsLoading(false);
      setIsPublishing(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    await submitWithStatus(data.status as "DRAFT" | "ACTIVE" | "ARCHIVED");
  };

  const isEditMode = Boolean(initialData?.id);
  const hasLinkedInventory = Boolean(linkedProductId || activeInventoryItem?.id);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Modern Luxury Executive Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={returnPath}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Catalog
              </Link>
              <span className="text-muted-foreground/40">&bull;</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Storefront Publishing Suite
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
              {initialData ? "Edit Storefront Product" : "Create Storefront Product"}
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              {initialData
                ? `Managing online catalog listing: ${initialData.name}`
                : "Synchronize warehouse inventory with online shop, optimize pricing, media & SEO."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(returnPath)}
              disabled={isLoading || isPublishing}
              className="h-9 px-3.5 text-xs font-medium rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrintModalOpen(true)}
              className="h-9 px-3 text-xs font-medium rounded-xl cursor-pointer gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              Barcodes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!isEditMode && !hasLinkedInventory) {
                  toast.error("Inventory item required! Please select an inventory product before saving.");
                  setPickerOpen(true);
                  return;
                }
                submitWithStatus("DRAFT");
              }}
              disabled={isLoading || isPublishing}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button
              type="button"
              className={cn(
                "h-9 px-5 text-xs font-semibold shadow-xs rounded-xl cursor-pointer text-white",
                !isEditMode && !hasLinkedInventory
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-emerald-600 hover:bg-emerald-500"
              )}
              onClick={() => {
                if (!isEditMode && !hasLinkedInventory) {
                  toast.error("Inventory item required! You cannot add a product without selecting an inventory product first. Please select an item from Inventory.");
                  setPickerOpen(true);
                  return;
                }
                submitWithStatus("ACTIVE");
              }}
              disabled={isLoading || isPublishing}
            >
              {isPublishing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {isPublishing ? "Publishing..." : "Publish to Store"}
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

        {/* Sleek Form Section Stepper / Navigation Bar */}
        <div className="mb-2 px-3 py-2 bg-muted/30 border border-border/60 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none rounded-xl">
          <div className="flex items-center gap-1.5 min-w-max">
            <a
              href="#section-basics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-2xs transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              1. Basics &amp; Details
            </a>
            <a
              href="#section-images"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ImagePlus className="h-3.5 w-3.5 text-primary" />
              2. Imagery ({form.watch("media")?.length || 0})
            </a>
            <a
              href="#section-architecture"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              3. Variants ({productType === "VARIABLE" ? (form.watch("variants")?.length || 0) : "Single"})
            </a>
            <a
              href="#section-pricing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Calculator className="h-3.5 w-3.5 text-primary" />
              4. Pricing &amp; Margin
            </a>
            <a
              href="#section-organization"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <FolderTree className="h-3.5 w-3.5 text-primary" />
              5. Organization &amp; SEO
            </a>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              Status: <strong className="text-foreground">{form.watch("status") || "DRAFT"}</strong>
            </span>
          </div>
        </div>

        {/* Product Type Architecture Selector (Single Product vs Variable Product Matrix) */}
        <Card id="section-architecture" className="border-border/70 shadow-sm bg-gradient-to-r from-card via-muted/15 to-card overflow-hidden scroll-mt-20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">Product Architecture</h2>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold px-2 py-0.5 ${
                          productType === "SINGLE"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {productType === "SINGLE" ? "Single Product Mode" : "Variable Product Matrix Mode"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {productType === "SINGLE"
                        ? "Standard product with 1 SKU, 1 Barcode, and simple stock (e.g. Belts, Perfume, Bags, One-size Shawls)."
                        : "Fashion garment with Colors × Sizes matrix, unique variant barcodes, and individual stock levels."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setProductType("SINGLE")}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    productType === "SINGLE"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/25"
                      : "bg-background text-muted-foreground border-border/80 hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <Boxes className="h-4 w-4" />
                  <div className="text-left">
                    <div>Single Product</div>
                    <div className={`text-[10px] font-normal ${productType === "SINGLE" ? "opacity-85" : "text-muted-foreground"}`}>
                      1 SKU / Standard
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProductType("VARIABLE")}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    productType === "VARIABLE"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/25"
                      : "bg-background text-muted-foreground border-border/80 hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <div className="text-left">
                    <div>Variable Product</div>
                    <div className={`text-[10px] font-normal ${productType === "VARIABLE" ? "opacity-85" : "text-muted-foreground"}`}>
                      Multi-Size &amp; Color
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3 pb-8">
          {/* Main Info Column */}
          <div className="space-y-6 md:col-span-2">
            <Card id="section-basics" className="border-border/60 shadow-sm scroll-mt-20">
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold">General Information</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Product title, URL slug, description, and primary brand identity
                    </p>
                  </div>
                </div>
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

                {/* EAN-13 Barcode / Product Scanner Tag */}
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FormLabel className="text-xs font-semibold">Barcode / EAN-13</FormLabel>
                          {field.value && (
                            <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-800 border-sky-300 font-mono py-0 px-1.5">
                              {field.value.length === 13 ? "✓ Valid EAN-13" : "Custom Barcode"}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 cursor-pointer gap-1 font-semibold"
                          onClick={() => {
                            const ean = generateEAN13Sync();
                            field.onChange(ean);
                            toast.success(`Generated standard EAN-13 barcode: ${ean}`);
                          }}
                        >
                          <BarcodeIcon className="h-3 w-3" />
                          Auto-Generate (EAN-13)
                        </Button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <BarcodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="e.g. 8942001004523 or scan with barcode gun"
                            {...field}
                            value={field.value || ""}
                            className="pl-8 font-mono tracking-wider text-sm bg-background border-border/80"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Standard 13-digit EAN barcode for POS checkout scanning, label sticker printing, and warehouse intake.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

            <Card id="section-images" className="border-border/60 shadow-sm scroll-mt-20">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ImagePlus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold">Product Photography</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono">
                        {mediaFields.length} {mediaFields.length === 1 ? "Image" : "Images"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      High-resolution studio photography. First image is featured on storefront listing.
                    </p>
                  </div>
                </div>
                <label className="cursor-pointer">
                  <div className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-2xs hover:bg-muted text-foreground transition-colors">
                    {uploadingImage !== null ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-primary" />
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
              <CardContent className="space-y-4 pt-4">
                {mediaFields.map((field, index) => {
                  const currentUrl = form.watch(`media.${index}.url`);
                  return (
                    <div key={field.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 transition-all hover:border-primary/30">
                      <div className="flex items-start gap-4">
                        {/* Preview thumbnail */}
                        <div className="h-20 w-20 shrink-0 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center shadow-2xs">
                          {currentUrl ? (
                            <img
                              src={currentUrl}
                              alt={form.watch(`media.${index}.altText`) || `Image ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground/40">
                              <Upload className="h-6 w-6" />
                              <span className="text-[10px] mt-1 font-mono">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          {/* Upload label */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                {index === 0 ? "Primary Thumbnail" : `Gallery Photo #${index + 1}`}
                                {index === 0 && (
                                  <Badge className="text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0">Main</Badge>
                                )}
                              </p>
                            </div>
                            <label className="cursor-pointer block">
                              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card hover:bg-muted/50 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                                {uploadingImage === index ? (
                                  <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /><span>Uploading to CDN...</span></>
                                ) : (
                                  <><Upload className="h-3.5 w-3.5 text-primary" /><span>{currentUrl ? "Replace File" : "Upload File"}</span></>
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
                                <FormLabel className="text-xs font-medium text-muted-foreground">SEO Alt Text</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Describe this photo for screen readers &amp; SEO..."
                                    {...field}
                                    value={field.value || ""}
                                    className="h-8 text-xs bg-card"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {/* Controls */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMedia(index)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <FormField
                            control={form.control}
                            name={`media.${index}.isPrimary`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col items-center gap-1">
                                <FormLabel className="text-[10px] text-muted-foreground font-medium">Primary</FormLabel>
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
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-8 text-center hover:border-primary/50 hover:bg-muted/40 transition-all group">
                    {uploadingImage !== null ? (
                      <>
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-semibold text-foreground">Uploading images...</p>
                        <p className="mt-1 text-xs text-muted-foreground">Compressing and storing securely on CDN.</p>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Click to upload product photography</p>
                        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP • Recommended 1200×1600px luxury ratio</p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground shadow-2xs">
                          <Upload className="h-3.5 w-3.5 text-primary" /> Choose Files
                        </div>
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

            {/* Product Variants Matrix Card */}
            {productType === "SINGLE" ? (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-lg">Product Variants &amp; Architecture</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">Single product mode enabled (1 SKU / Standard)</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProductType("VARIABLE")}
                    className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 cursor-pointer font-semibold"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Enable Variable Mode
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-6 text-center space-y-2.5">
                    <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Single Product (Standard Style)</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      This item uses standard stock, cost, and selling price. If this garment has sizes (S, M, L, XL) or color choices, switch to Variable Product Mode to generate a variation matrix.
                    </p>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setProductType("VARIABLE")}
                        className="cursor-pointer gap-1.5 text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" /> Enable Multi-Size &amp; Color Variations
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Product Variations Matrix</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono bg-purple-50 text-purple-700 border-purple-200">
                        {variantFields.length} {variantFields.length === 1 ? "Variant" : "Variants"}
                      </Badge>
                      {variantFields.length > 0 && (
                        <Badge variant="outline" className="text-xs font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
                          Total Stock: {variantFields.reduce((sum, _, i) => sum + (Number(form.watch(`variants.${i}.stockQuantity`)) || 0), 0)} pcs
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Generate multi-variant matrix with unique SKUs, barcodes, and opening stock levels.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {variantFields.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAllVariantBarcodes}
                        className="h-8 text-xs gap-1 cursor-pointer text-sky-700 border-sky-300 hover:bg-sky-50"
                        title="Generate EAN-13 barcodes for all variants"
                      >
                        <BarcodeIcon className="h-3.5 w-3.5" /> Auto-Gen Barcodes
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentSlug = form.getValues("slug")?.trim() || form.getValues("name")?.trim() || "PROD";
                        const cleanPrefix = currentSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                        appendVariant({
                          sku: `${cleanPrefix}-V${variantFields.length + 1}`,
                          barcode: generateEAN13Sync(),
                          priceOverride: form.getValues("basePrice") || undefined,
                          costPrice: form.getValues("costPrice") || undefined,
                          isActive: true,
                          attributes: {},
                          stockQuantity: 0,
                          soldQuantity: 0,
                        });
                      }}
                      className="h-8 text-xs gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Single Variant
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Quick Variant Matrix Generator Studio */}
                  <div className="rounded-lg border border-purple-200/80 bg-purple-50/30 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-purple-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                          ⚡ Apparel Variation Matrix Generator
                        </h4>
                      </div>
                      <span className="text-[11px] text-purple-700">
                        {matrixColors.length} Colors × {matrixSizes.length} Sizes ={" "}
                        <strong className="font-bold">{matrixColors.length * matrixSizes.length} Combinations</strong>
                      </span>
                    </div>

                    {/* Colors Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">1. Select Colors:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="+ Custom Color"
                            value={customColorInput}
                            onChange={(e) => setCustomColorInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customColorInput.trim()) {
                                e.preventDefault();
                                if (!matrixColors.includes(customColorInput.trim())) {
                                  setMatrixColors([...matrixColors, customColorInput.trim()]);
                                }
                                setCustomColorInput("");
                              }
                            }}
                            className="h-6 w-28 text-[11px] px-2 rounded border border-border bg-background"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-purple-700"
                            onClick={() => {
                              if (customColorInput.trim()) {
                                if (!matrixColors.includes(customColorInput.trim())) {
                                  setMatrixColors([...matrixColors, customColorInput.trim()]);
                                }
                                setCustomColorInput("");
                              }
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Black",
                          "White",
                          "Navy Blue",
                          "Olive Green",
                          "Charcoal Grey",
                          "Heather Grey",
                          "Maroon",
                          "Beige",
                          "Brown",
                          "Sky Blue",
                          "Burgundy",
                          "Royal Blue",
                        ].map((c) => {
                          const isSel = matrixColors.includes(c);
                          return (
                            <button
                              type="button"
                              key={c}
                              onClick={() => {
                                setMatrixColors(isSel ? matrixColors.filter((x) => x !== c) : [...matrixColors, c]);
                              }}
                              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                                isSel
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {isSel ? "✓ " : ""}
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sizes Selector with Category Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">2. Select Sizes:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="+ Custom Size"
                            value={customSizeInput}
                            onChange={(e) => setCustomSizeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customSizeInput.trim()) {
                                e.preventDefault();
                                if (!matrixSizes.includes(customSizeInput.trim())) {
                                  setMatrixSizes([...matrixSizes, customSizeInput.trim()]);
                                }
                                setCustomSizeInput("");
                              }
                            }}
                            className="h-6 w-28 text-[11px] px-2 rounded border border-border bg-background"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-purple-700"
                            onClick={() => {
                              if (customSizeInput.trim()) {
                                if (!matrixSizes.includes(customSizeInput.trim())) {
                                  setMatrixSizes([...matrixSizes, customSizeInput.trim()]);
                                }
                                setCustomSizeInput("");
                              }
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Quick Sizing System Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 py-1 bg-purple-50/60 p-2 rounded-md border border-purple-100">
                        <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider mr-1">Presets:</span>
                        {APPAREL_SIZE_SYSTEMS.map((sys) => (
                          <button
                            key={sys.id}
                            type="button"
                            onClick={() => setMatrixSizes(sys.sizes)}
                            className="text-[11px] px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            {sys.label}
                          </button>
                        ))}
                        {matrixSizes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMatrixSizes([])}
                            className="text-[10px] px-1.5 py-0.5 text-red-500 hover:text-red-700 font-medium cursor-pointer ml-auto"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Individual Size Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {["XS", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32", "34", "36", "38", "Free Size"].map((s) => {
                          const isSel = matrixSizes.includes(s);
                          return (
                            <button
                              type="button"
                              key={s}
                              onClick={() => {
                                setMatrixSizes(isSel ? matrixSizes.filter((x) => x !== s) : [...matrixSizes, s]);
                              }}
                              className={`text-xs px-2.5 py-1 rounded-md border font-mono font-medium transition-all cursor-pointer ${
                                isSel
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {isSel ? "✓ " : ""}
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Generator Trigger Button */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        onClick={handleGenerateVariantMatrix}
                        className="bg-purple-700 hover:bg-purple-600 text-white cursor-pointer gap-2 text-xs font-semibold h-9"
                      >
                        <Wand2 className="h-4 w-4" />
                        Generate Matrix ({matrixColors.length * matrixSizes.length} Variants with SKUs &amp; Barcodes)
                      </Button>
                      {variantFields.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue("variants", [], { shouldValidate: true })}
                          className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          Clear All Variations
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bulk Applicator Bar (when variants exist) */}
                  {variantFields.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                        ⚡ Bulk Edit:
                      </span>

                      {/* Bulk Sell Price */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Sell Price"
                          value={bulkSellPrice}
                          onChange={(e) => setBulkSellPrice(e.target.value)}
                          className="h-7 w-24 text-xs bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkApplyToVariants("price")}
                          className="h-7 px-2 text-[11px] cursor-pointer"
                        >
                          Apply Sell
                        </Button>
                      </div>

                      {/* Bulk Buy Cost */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Buy Cost"
                          value={bulkCostPrice}
                          onChange={(e) => setBulkCostPrice(e.target.value)}
                          className="h-7 w-24 text-xs bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkApplyToVariants("cost")}
                          className="h-7 px-2 text-[11px] cursor-pointer"
                        >
                          Apply Cost
                        </Button>
                      </div>

                      {/* Bulk Stock */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={bulkStock}
                          onChange={(e) => setBulkStock(e.target.value)}
                          className="h-7 w-20 text-xs bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkApplyToVariants("stock")}
                          className="h-7 px-2 text-[11px] cursor-pointer"
                        >
                          Apply Stock
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Variants List / Table */}
                  <div className="space-y-3">
                    {variantFields.map((field, index) => {
                      const currentAttrs = (form.watch(`variants.${index}.attributes`) as Record<string, string>) || {};
                      const attrDisplay = Object.values(currentAttrs).filter(Boolean).join(" / ") || `Variant ${index + 1}`;

                      return (
                        <div
                          key={field.id}
                          className="rounded-lg border border-border/80 bg-slate-50/50 p-3.5 space-y-2.5 transition-all hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-bold text-xs bg-slate-200/80 text-slate-800">
                                #{index + 1}
                              </Badge>
                              <Badge variant="outline" className="font-semibold text-xs bg-purple-50 text-purple-800 border-purple-200">
                                {attrDisplay}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(index)}
                              className="h-7 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="mr-1 h-3 w-3" /> Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
                            {/* Color/Size Edit */}
                            <FormField
                              control={form.control}
                              name={`variants.${index}.attributes`}
                              render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-1">
                                  <FormLabel className="text-xs">Color / Size</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Black / L"
                                      value={
                                        field.value
                                          ? Object.entries(field.value as Record<string, string>)
                                              .map(([_, v]) => `${v}`)
                                              .join(" / ") || ""
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const parts = e.target.value.split("/").map((s) => s.trim());
                                        const newAttrs: Record<string, string> = {};
                                        if (parts[0]) newAttrs.Color = parts[0];
                                        if (parts[1]) newAttrs.Size = parts[1];
                                        field.onChange(newAttrs);
                                      }}
                                      className="h-8 text-xs bg-background"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {/* SKU */}
                            <FormField
                              control={form.control}
                              name={`variants.${index}.sku`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Variant SKU</FormLabel>
                                  <FormControl>
                                    <Input placeholder="AFPTS1-BLK-M" {...field} className="h-8 text-xs font-mono font-bold bg-background" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Barcode (EAN-13) with 1-click Regen */}
                            <FormField
                              control={form.control}
                              name={`variants.${index}.barcode`}
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs">Barcode</FormLabel>
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(generateEAN13Sync())}
                                      className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                                      title="Auto-generate EAN-13 barcode"
                                    >
                                      Regen
                                    </button>
                                  </div>
                                  <FormControl>
                                    <Input
                                      placeholder="89420..."
                                      {...field}
                                      value={field.value || ""}
                                      className="h-8 text-xs font-mono bg-background"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Cost / Buy Price */}
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
                                      className="h-8 text-xs bg-background"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Sell Price */}
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
                                      className="h-8 text-xs font-semibold bg-background"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Opening Stock Quantity */}
                            <FormField
                              control={form.control}
                              name={`variants.${index}.stockQuantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold text-emerald-800">Stock (Opening)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      {...field}
                                      value={field.value ?? 0}
                                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                      className="h-8 text-xs font-bold text-emerald-900 bg-emerald-50/50 border-emerald-300"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {variantFields.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                        No variations generated yet. Choose colors and sizes above, then click &quot;Generate Matrix&quot;.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing & Profit Margin Engine */}
            <Card id="section-pricing" className="border-border/60 shadow-sm scroll-mt-20">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">Pricing &amp; Profit Engine</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                          Automated Markup
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define wholesale unit cost (COGS) and calculate selling price with target margins
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. Buy / Cost Price */}
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">1. Purchase Cost (COGS) ({CURRENCY_SYMBOL})</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">{CURRENCY_SYMBOL}</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-7 h-9 text-sm font-semibold"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                field.onChange(val);
                                if (val && Number(marginPercent) > 0) {
                                  const newSell = Math.round(val * (1 + Number(marginPercent) / 100));
                                  form.setValue("basePrice", newSell, { shouldValidate: true });
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-[11px]">Factory / Supplier wholesale cost</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 2. Profit Margin % Selector & Presets */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3 text-emerald-600" />
                        2. Target Margin %
                      </label>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        +{marginPercent}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="0"
                        max="1000"
                        placeholder="e.g. 40"
                        value={marginPercent}
                        onChange={(e) => {
                          const m = e.target.value;
                          setMarginPercent(m);
                          const numM = parseFloat(m);
                          const cost = Number(form.getValues("costPrice")) || 0;
                          if (!isNaN(numM) && cost > 0) {
                            const newSell = Math.round(cost * (1 + numM / 100));
                            form.setValue("basePrice", newSell, { shouldValidate: true });
                          }
                        }}
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <div className="flex flex-wrap gap-1">
                        {[20, 30, 40, 50, 60, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setMarginPercent(pct);
                              const cost = Number(form.getValues("costPrice")) || 0;
                              if (cost > 0) {
                                const newSell = Math.round(cost * (1 + pct / 100));
                                form.setValue("basePrice", newSell, { shouldValidate: true });
                              }
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold transition-all cursor-pointer ${
                              Number(marginPercent) === pct
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-muted text-muted-foreground border border-border hover:bg-muted/80 hover:text-foreground"
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Sell Price */}
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">3. Retail Selling Price ({CURRENCY_SYMBOL}) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">{CURRENCY_SYMBOL}</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-7 h-9 text-sm font-bold text-foreground"
                              {...field}
                              onChange={(e) => {
                                const sellVal = parseFloat(e.target.value) || 0;
                                field.onChange(sellVal);
                                const cost = Number(form.getValues("costPrice")) || 0;
                                if (cost > 0 && sellVal > cost) {
                                  const calculatedMargin = Math.round(((sellVal - cost) / cost) * 100);
                                  setMarginPercent(calculatedMargin);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-[11px]">Customer-facing selling price</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dynamic Profit Margin Badge */}
                {(() => {
                  const base = Number(form.watch("basePrice")) || 0;
                  const cost = Number(form.watch("costPrice")) || 0;
                  const profit = base - cost;
                  const margin = cost > 0 ? Math.round((profit / cost) * 100) : 0;
                  if (base > 0 && cost > 0) {
                    return (
                      <div className="rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 p-3.5 text-xs text-foreground flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-semibold">Projected Gross Margin</p>
                            <p className="font-bold text-sm text-foreground">+৳{profit.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">per unit sold</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                            +{margin}% Markup
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 4. Sale / Promotional Price */}
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => {
                    const basePrice = Number(form.watch("basePrice")) || 0;
                    const salePrice = Number(field.value) || 0;
                    const hasSale = salePrice > 0;
                    const isValidDiscount = hasSale && basePrice > 0 && salePrice < basePrice;
                    const isInvalidDiscount = hasSale && basePrice > 0 && salePrice >= basePrice;
                    const discountPct = isValidDiscount ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;
                    const savings = isValidDiscount ? basePrice - salePrice : 0;

                    return (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Sale / Offer Price ({CURRENCY_SYMBOL}) <span className="text-muted-foreground font-normal">(Optional promotional discount)</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">{CURRENCY_SYMBOL}</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00 (optional discount)"
                              className="pl-7 h-9 text-sm"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                              }
                            />
                          </div>
                        </FormControl>
                        {isValidDiscount && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                            <span className="font-bold">✓ {discountPct}% OFF</span>
                            <span className="font-medium">
                              (Customer saves ৳{savings.toLocaleString()})
                            </span>
                          </div>
                        )}
                        {isInvalidDiscount && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                            <span>⚠️ Sale price must be strictly less than retail price (৳{basePrice}) to provide a valid customer discount.</span>
                          </div>
                        )}
                        <FormDescription className="text-[11px]">Displays strikethrough regular price on storefront if active</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Inventory & Opening Stock Intake Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">Inventory &amp; Opening Stock</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-mono text-blue-700 bg-blue-50 border-blue-200">
                          Warehouse Sync
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Physical facility allocation and audit-tracked opening stock balances
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrintModalOpen(true)}
                    className="h-7 text-xs px-2.5 text-primary hover:bg-primary/5 cursor-pointer gap-1.5 font-semibold rounded-lg"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Barcodes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination Warehouse */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Destination Facility / Store</label>
                    <Select
                      value={selectedWarehouseId}
                      onValueChange={(val) => {
                        setSelectedWarehouseId(val);
                        form.setValue("warehouseId" as any, val);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Warehouse Location">
                          {warehouses.find((w) => w.id === selectedWarehouseId)?.name || "Main Central Warehouse (WH-MAIN-01)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id} className="text-xs">
                            {w.name} {w.code ? `(${w.code})` : ""}
                          </SelectItem>
                        ))}
                        {warehouses.length === 0 && (
                          <SelectItem value="default" className="text-xs">
                            Main Central Warehouse (WH-MAIN-01)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Initial intake movements will be booked to this location.
                    </p>
                  </div>

                  {/* Opening Stock Quantity */}
                  {productType === "SINGLE" ? (
                    <FormField
                      control={form.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-semibold">Opening Stock Quantity</FormLabel>
                            {Number(field.value) > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-mono py-0 px-1.5">
                                ✓ Auto-Intake
                              </Badge>
                            )}
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="h-9 font-semibold text-sm"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value, 10) || 0)
                              }
                            />
                          </FormControl>
                          <FormDescription className="text-[11px]">
                            Physical available units. Recorded to Stock Movements ledger.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-900 dark:text-purple-200">Aggregated Variant Stock:</span>
                        <span className="font-bold text-sm text-purple-900 dark:text-purple-200 font-mono">
                          {variantFields.reduce((sum, _, i) => sum + (Number(form.watch(`variants.${i}.stockQuantity`)) || 0), 0)} pcs
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300">
                        Stock is calculated dynamically from individual sizes/colors in the Variations Matrix.
                      </p>
                    </div>
                  )}
                </div>

                {/* Low Stock Alert Quantity (Reorder Point) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Alert Quantity (Reorder Point)</label>
                    <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                      {alertQuantity} pcs
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={alertQuantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 0;
                      setAlertQuantity(v);
                      form.setValue("alertQuantity" as any, v);
                    }}
                    className="h-9 text-xs font-mono max-w-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Triggers low-stock badges when available units drop below this threshold.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Search Engine Optimization (SEO) */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Search Engine Optimization (SEO)</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Customize Google snippet &amp; social sharing preview</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="seo.metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Meta Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Luxury Linen Classic Shirt | Anchor Fashion"
                          {...field}
                          value={field.value || ""}
                          className="h-9 text-xs"
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
                      <FormLabel className="text-xs font-medium">Meta Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of this product for search results..."
                          {...field}
                          value={field.value || ""}
                          className="text-xs resize-none"
                          rows={3}
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
          <div className="space-y-6 md:col-span-1">
            <div className="space-y-6">
              {/* Real-time Storefront Live Preview Card */}
              <StorefrontLivePreview
                name={form.watch("name") || ""}
                categoryName={
                  categories.find((c) => c.id === form.watch("categoryId"))?.name ||
                  categories.find((c) => form.watch("categoryIds")?.includes(c.id))?.name ||
                  "Apparel"
                }
                brandName={brands.find((b) => b.id === form.watch("brandId"))?.name || "Anchor Fashion"}
                sku={form.watch("sku") || activeInventoryItem?.sku || ""}
                basePrice={Number(form.watch("basePrice")) || 0}
                salePrice={form.watch("salePrice")}
                costPrice={form.watch("costPrice")}
                media={form.watch("media") || []}
                variants={form.watch("variants") || []}
                status={form.watch("status") || "DRAFT"}
              />

              {/* Status & Taxonomy / Organization Card */}
              <Card id="section-organization" className="border-border/60 shadow-sm scroll-mt-20">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FolderTree className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Status &amp; Taxonomy</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Storefront visibility &amp; categories</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Publishing Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          items={[
                            { value: "DRAFT", label: "Draft (Hidden from shoppers)" },
                            { value: "ACTIVE", label: "Active (Live on website)" },
                            { value: "ARCHIVED", label: "Archived (Discontinued)" },
                          ]}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select a status">
                                {field.value === "ACTIVE"
                                  ? "Active (Live on website)"
                                  : field.value === "DRAFT"
                                  ? "Draft (Hidden from shoppers)"
                                  : field.value === "ARCHIVED"
                                  ? "Archived (Discontinued)"
                                  : undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT" className="text-xs">Draft (Hidden from shoppers)</SelectItem>
                            <SelectItem value="ACTIVE" className="text-xs">Active (Live on website)</SelectItem>
                            <SelectItem value="ARCHIVED" className="text-xs">Archived (Discontinued)</SelectItem>
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
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border bg-muted/20 p-3 shadow-2xs">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-semibold">Featured Garment</FormLabel>
                          <FormDescription className="text-[11px]">Pin to storefront homepage showcases</FormDescription>
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

                  {/* WordPress-Style Hierarchical Multi-Category Selector */}
                  <div className="pt-2">
                    <CategoryHierarchySelector
                      categories={categories}
                      selectedCategoryIds={
                        form.watch("categoryIds") && form.watch("categoryIds")!.length > 0
                          ? form.watch("categoryIds")!
                          : form.watch("categoryId")
                          ? [form.watch("categoryId")!]
                          : []
                      }
                      primaryCategoryId={form.watch("categoryId")}
                      onSelectionChange={(selectedIds, primaryId) => {
                        form.setValue("categoryIds", selectedIds, { shouldValidate: true });
                        form.setValue("categoryId", primaryId || "", { shouldValidate: true });

                        // Auto generate SKU if needed when primary category changes
                        const currentSku = form.getValues("sku");
                        const currentName = form.getValues("name");
                        if (!currentSku && currentName?.trim()) {
                          setTimeout(() => handleGenerateCode(), 100);
                        }
                      }}
                      onCategoryCreated={(newCat) => {
                        setCategories((prev) => [...prev, newCat]);
                      }}
                    />
                    {form.formState.errors.categoryId && (
                      <p className="text-destructive text-xs font-medium mt-1.5">
                        {form.formState.errors.categoryId.message || "Please select at least one primary category."}
                      </p>
                    )}
                  </div>

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
                          <FormLabel className="text-xs font-semibold">Brand / Designer</FormLabel>
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
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select a brand">
                                  {brandDisplayValue}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">No Brand</SelectItem>
                              {brands.map((brand) => (
                                <SelectItem key={brand.id} value={brand.id} className="text-xs">
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

              {/* Executive Publishing Checklist Tips */}
              <div className="rounded-xl bg-muted/40 border border-border p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Executive Publishing Checklist
                </p>
                <p>• <strong>Save Draft:</strong> Saves style data without making it visible to storefront shoppers.</p>
                <p>• <strong>Publish to Store:</strong> Makes style immediately live and purchasable online.</p>
                <p>• <strong>Variants Matrix:</strong> Use for fashion styles with size/color options.</p>
                <p>• <strong>Warehouse Link:</strong> Real stock sync prevents accidental overselling.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {!isEditMode && !hasLinkedInventory ? (
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                Select an inventory product above to enable live publishing.
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Ready to publish: <strong>{form.watch("name") || "Product"}</strong> ({form.watch("sku") || "SKU"})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(returnPath)}
              disabled={isLoading || isPublishing}
              className="cursor-pointer rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!isEditMode && !hasLinkedInventory) {
                  toast.error("Inventory item required! Please select an inventory product before saving.");
                  setPickerOpen(true);
                  return;
                }
                submitWithStatus("DRAFT");
              }}
              disabled={isLoading || isPublishing}
              className="cursor-pointer rounded-xl h-9"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button
              type="button"
              className={cn(
                "cursor-pointer font-semibold shadow-xs rounded-xl h-9 px-5",
                !isEditMode && !hasLinkedInventory
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              )}
              onClick={() => {
                if (!isEditMode && !hasLinkedInventory) {
                  toast.error("Inventory item required! You cannot add a product without selecting an inventory product first. Please select an item from Inventory.");
                  setPickerOpen(true);
                  return;
                }
                submitWithStatus("ACTIVE");
              }}
              disabled={isLoading || isPublishing}
            >
              {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPublishing ? "Publishing..." : "Publish Product"}
            </Button>
          </div>
        </div>
      </form>

      {/* Select from Inventory Master Modal */}
      <InventoryPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectProduct={handleSelectInventoryProduct}
        categories={categories}
        onOpenIntake={(catId) => {
          if (catId) setIntakeDefaultCategory(catId);
          setIntakeModalOpen(true);
        }}
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

      {/* Barcode Sticker Sheet / Label Generator Modal */}
      <PrintBarcodeModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        labels={barcodePrintItems}
      />
    </Form>
  );
}
