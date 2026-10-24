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
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  RefreshCw,
  Check,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
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
          ? rawValues.variants.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0)
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
              onClick={() => setPrintModalOpen(true)}
              className="cursor-pointer gap-1.5 text-xs text-slate-700 hover:text-primary hover:bg-primary/5"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              Print Barcodes
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
              className="cursor-pointer"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              type="button"
              className={cn(
                "cursor-pointer text-white font-semibold shadow-xs rounded-xl px-4",
                !isEditMode && !hasLinkedInventory
                  ? "bg-slate-900 hover:bg-slate-800"
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
              {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPublishing ? "Publishing..." : "Publish Product"}
            </Button>
          </div>
        </div>

        {/* VERIFIED LINKED INVENTORY ITEM CARD (Shows when an item is linked) */}
        {hasLinkedInventory && (
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-slate-900 hover:bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold gap-1.5 px-3 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Linked Warehouse Inventory
                  </Badge>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {activeInventoryItem?.sku || form.watch("sku") || initialData?.sku || "SKU"}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {activeInventoryItem?.name || form.watch("name") || initialData?.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stock, pricing &amp; barcodes synchronized with physical warehouse. Now fine-tune imagery, copy, and store categories to publish.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium cursor-pointer rounded-xl h-8 border-slate-200 dark:border-slate-700"
                  onClick={() => setPickerOpen(true)}
                >
                  Change Style
                </Button>
                <Link href="/admin/inventory" target="_blank">
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 cursor-pointer h-8">
                    Inventory Center <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px] font-medium">Warehouse Stock</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {activeInventoryItem?.totalAvailable ?? form.watch("stockQuantity") ?? 0} units
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px] font-medium">Retail MRP</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  ৳{Number(activeInventoryItem?.basePrice || form.watch("basePrice") || 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px] font-medium">Unit Cost (COGS)</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  ৳{Number(activeInventoryItem?.costPrice || form.watch("costPrice") || 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px] font-medium">Barcode / EAN-13</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white text-xs truncate block">
                  {activeInventoryItem?.barcode || form.watch("barcode") || initialData?.barcode || "—"}
                </span>
              </div>
            </div>
          </div>
        )}

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

        {/* Product Type Architecture Selector (Single Product vs Variable Product Matrix) */}
        <Card className="border-border/70 shadow-sm bg-gradient-to-r from-card via-muted/15 to-card overflow-hidden">
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

            {/* Pricing & Profit Margin Engine */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-base font-bold">Pricing &amp; Profit Engine</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                    Retail Calculator
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 1. Buy / Cost Price */}
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">1. Purchase Cost / Buy Price ({CURRENCY_SYMBOL})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-7 h-9 text-sm"
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
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Percent className="h-3 w-3 text-emerald-600" />
                      2. Profit Margin % (Markup)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      +{marginPercent}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                      className="h-8 text-xs font-mono font-bold w-20"
                    />
                    <div className="flex flex-wrap gap-1 flex-1">
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
                          className={`text-[11px] px-2 py-1 rounded font-mono font-semibold transition-all cursor-pointer ${
                            Number(marginPercent) === pct
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
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
                      <FormLabel className="text-xs font-semibold">3. Retail Selling Price ({CURRENCY_SYMBOL}) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">{CURRENCY_SYMBOL}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-7 h-9 text-sm font-bold text-slate-900"
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

                {/* Dynamic Profit Margin Badge */}
                {(() => {
                  const base = Number(form.watch("basePrice")) || 0;
                  const cost = Number(form.watch("costPrice")) || 0;
                  const profit = base - cost;
                  const margin = cost > 0 ? Math.round((profit / cost) * 100) : 0;
                  if (base > 0 && cost > 0) {
                    return (
                      <div className="rounded-lg bg-emerald-50/90 border border-emerald-300 p-3 text-xs text-emerald-950 flex items-center justify-between shadow-xs">
                        <div>
                          <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Unit Gross Profit</p>
                          <p className="font-bold text-sm text-emerald-900">+৳{profit.toLocaleString()} <span className="text-[11px] font-normal text-emerald-700">/ pc</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Markup Margin</p>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-700 text-white shadow-xs">
                            +{margin}%
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
                        <FormLabel className="text-xs font-semibold">Sale / Offer Price ({CURRENCY_SYMBOL}) <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">{CURRENCY_SYMBOL}</span>
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
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                            <span className="font-bold">✓ {discountPct}% OFF</span>
                            <span className="text-emerald-800 font-medium">
                              (Customer saves ৳{savings.toLocaleString()})
                            </span>
                          </div>
                        )}
                        {isInvalidDiscount && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-300">
                            <span>⚠️ Sale price should be less than regular price (৳{basePrice}) to provide a discount.</span>
                          </div>
                        )}
                        <FormDescription className="text-[11px]">Shows strikethrough regular price on storefront if set</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Inventory & Opening Stock Intake Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-base font-bold">Inventory &amp; Opening Stock</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrintModalOpen(true)}
                    className="h-6 text-[11px] px-2 text-sky-700 hover:text-sky-900 hover:bg-sky-50 cursor-pointer gap-1 font-semibold"
                  >
                    <Printer className="h-3 w-3" />
                    Print Stickers
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Destination Warehouse */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Destination Warehouse / Store</label>
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
                    Initial intake stock movements will be assigned to this facility.
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
                          Available physical units. Opening stock automatically creates an audit entry in Stock Movements ledger.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-900">Multi-Variant Aggregated Stock:</span>
                      <span className="font-bold text-sm text-purple-900 font-mono">
                        {variantFields.reduce((sum, _, i) => sum + (Number(form.watch(`variants.${i}.stockQuantity`)) || 0), 0)} pcs
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-700">
                      Stock is managed per variant in the Variations Matrix. The overall product stock is automatically maintained as the sum of all variant opening stocks.
                    </p>
                  </div>
                )}

                {/* Low Stock Alert Quantity (Reorder Point) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Alert Quantity (Reorder Point)</label>
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
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Triggers low stock alert badges on POS inventory shelf when available units drop below this threshold.
                  </p>
                </div>
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

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-card/95 shadow-sm backdrop-blur-xs">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {!isEditMode && !hasLinkedInventory ? (
              <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
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
                "cursor-pointer text-white font-semibold shadow-xs rounded-xl h-9 px-5",
                !isEditMode && !hasLinkedInventory
                  ? "bg-slate-900 hover:bg-slate-800"
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
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        items={barcodePrintItems}
      />
    </Form>
  );
}
