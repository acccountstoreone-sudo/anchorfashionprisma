"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ProductActions } from "./product-actions";
import { cn, formatCurrency } from "@/lib/utils";
import { Check, AlertCircle, Zap, Copy } from "lucide-react";
import { toast } from "sonner";
import { SizeGuideModal } from "./size-guide-modal";
import { SizeChart } from "@/types/catalog.types";

export interface VariantAttributeValueRelational {
  attribute_values: {
    id: string;
    value: string;
    attributes: {
      id: string;
      name: string;
    };
  };
}

export interface InventoryLevelData {
  quantity_available: number;
  reorder_point?: number;
}

export interface VariantData {
  id: string;
  sku: string;
  price?: number | null;
  price_override?: number | null;
  sale_price?: number | null;
  stock_quantity?: number;
  is_active?: boolean;
  attributes?: Record<string, string> | string | null;
  variant_attribute_values?: VariantAttributeValueRelational[];
  inventory_levels?: InventoryLevelData[];
}

export interface ProductMediaItem {
  id: string;
  variant_id?: string | null;
  url: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface FlashSaleInfo {
  flash_price: number;
  stock_allocated: number;
  stock_sold: number;
}

export interface VariantChangeInfo {
  variant: VariantData | null;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  images: string[];
  stock: number;
  isOutOfStock: boolean;
}

export interface ProductVariantSelectorProps {
  productId: string;
  baseStockQuantity?: number;
  variants?: VariantData[];
  productName?: string;
  productPrice?: number;
  productSalePrice?: number | null;
  productSku?: string;
  productImages?: string[];
  productMedia?: ProductMediaItem[];
  flashSale?: FlashSaleInfo | null;
  sizeCharts?: SizeChart[];
  onVariantChange?: (info: VariantChangeInfo) => void;
}

/**
 * Normalizes attribute key-value pairs from either JSONB or relational join
 */
function normalizeAttributes(v: VariantData): Record<string, string> {
  const result: Record<string, string> = {};

  // 1. Check relational variant_attribute_values
  if (Array.isArray(v.variant_attribute_values)) {
    for (const item of v.variant_attribute_values) {
      const attrName = item?.attribute_values?.attributes?.name;
      const attrValue = item?.attribute_values?.value;
      if (attrName && attrValue) {
        result[attrName.trim()] = attrValue.trim();
      }
    }
  }

  // 2. Check JSONB attributes
  if (v.attributes) {
    let parsed = v.attributes;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // Fallback for comma-separated or raw string
      }
    }
    if (typeof parsed === "object" && parsed !== null) {
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "string" && val.trim()) {
          result[key.trim()] = val.trim();
        }
      }
    }
  }

  return result;
}

/**
 * Computes authoritative stock from inventory_levels
 */
function calculateVariantStock(v: VariantData, fallbackStock: number = 0): number {
  if (Array.isArray(v.inventory_levels) && v.inventory_levels.length > 0) {
    return v.inventory_levels.reduce(
      (sum, lvl) => sum + (lvl.quantity_available || 0),
      0
    );
  }
  if (typeof v.stock_quantity === "number") {
    return v.stock_quantity;
  }
  return fallbackStock;
}

const FASHION_COLOR_MAP: Record<string, string> = {
  black: "#111111",
  white: "#FFFFFF",
  "off white": "#FAF9F6",
  offwhite: "#FAF9F6",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  beige: "#F5F5DC",
  camel: "#C19A6B",
  khaki: "#C3B091",
  tan: "#D2B48C",
  brown: "#6E473B",
  chocolate: "#3D2314",
  grey: "#808080",
  gray: "#808080",
  "light grey": "#D3D3D3",
  "dark grey": "#4A4A4A",
  charcoal: "#333333",
  anthracite: "#292F36",
  navy: "#001F3F",
  "navy blue": "#0A192F",
  navyblue: "#0A192F",
  midnight: "#191970",
  "royal blue": "#4169E1",
  blue: "#1E3A8A",
  "sky blue": "#87CEEB",
  teal: "#008080",
  cyan: "#00FFFF",
  turquoise: "#40E0D0",
  green: "#1B4D3E",
  "forest green": "#228B22",
  olive: "#556B2F",
  "olive green": "#556B2F",
  emerald: "#50C878",
  sage: "#9CAF88",
  mint: "#98FF98",
  red: "#C41E3A",
  crimson: "#DC143C",
  maroon: "#800000",
  burgundy: "#800020",
  wine: "#722F37",
  pink: "#FFC0CB",
  "dusty pink": "#DDA0DD",
  blush: "#DE5D83",
  rose: "#FF007F",
  "rose gold": "#B76E79",
  gold: "#D4AF37",
  silver: "#C0C0C0",
  yellow: "#EAB308",
  mustard: "#FFDB58",
  orange: "#EA580C",
  rust: "#B7410E",
  copper: "#B87333",
  purple: "#6B21A8",
  lavender: "#E6E6FA",
  plum: "#8E4585",
};

function getFashionColorHex(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();
  if (FASHION_COLOR_MAP[normalized]) {
    return FASHION_COLOR_MAP[normalized];
  }
  const stripped = normalized.replace(/[^a-z]/g, "");
  if (FASHION_COLOR_MAP[stripped]) {
    return FASHION_COLOR_MAP[stripped];
  }
  if (colorName.startsWith("#")) {
    return colorName;
  }
  return stripped;
}

export function ProductVariantSelector({
  productId,
  baseStockQuantity = 0,
  variants = [],
  productName = "Product",
  productPrice = 0,
  productSalePrice = null,
  productSku = "",
  productImages = [],
  productMedia = [],
  flashSale = null,
  sizeCharts = [],
  onVariantChange,
}: ProductVariantSelectorProps) {
  // 1. Process variants with normalized attributes and stock
  const processedVariants = useMemo(() => {
    return (variants || []).map((v) => ({
      raw: v,
      attributes: normalizeAttributes(v),
      stock: calculateVariantStock(v, baseStockQuantity),
      isActive: v.is_active ?? true,
    }));
  }, [variants, baseStockQuantity]);

  // 2. Extract unique attribute dimensions (e.g., ["Color", "Size"])
  const attributeDimensions = useMemo(() => {
    const dimensionMap = new Map<string, Set<string>>();

    for (const v of processedVariants) {
      for (const [key, val] of Object.entries(v.attributes)) {
        if (!dimensionMap.has(key)) {
          dimensionMap.set(key, new Set<string>());
        }
        dimensionMap.get(key)!.add(val);
      }
    }

    return Array.from(dimensionMap.entries()).map(([name, valuesSet]) => ({
      name,
      values: Array.from(valuesSet),
    }));
  }, [processedVariants]);

  // 3. Determine initial attribute selection
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    if (processedVariants.length === 0) return {};

    // Prefer an in-stock variant
    const inStock = processedVariants.find((v) => v.isActive && v.stock > 0);
    if (inStock) return { ...inStock.attributes };

    // Otherwise first active variant
    const firstActive = processedVariants.find((v) => v.isActive);
    if (firstActive) return { ...firstActive.attributes };

    return { ...processedVariants[0].attributes };
  });

  const [quantity, setQuantity] = useState(1);

  // 4. Identify currently matched variant
  const matchedVariant = useMemo(() => {
    if (processedVariants.length === 0) return null;
    if (attributeDimensions.length === 0) {
      return processedVariants[0]?.raw || null;
    }

    // Check if every attribute dimension has been selected
    const allSelected = attributeDimensions.every((dim) =>
      Boolean(selectedAttributes[dim.name])
    );
    if (!allSelected) return null;

    const match = processedVariants.find((v) => {
      if (!v.isActive) return false;
      return Object.entries(selectedAttributes).every(
        ([key, val]) => v.attributes[key] === val
      );
    });

    return match ? match.raw : null;
  }, [processedVariants, attributeDimensions, selectedAttributes]);

  // 5. Determine stock status & quantities
  const currentStock = useMemo(() => {
    if (processedVariants.length === 0) {
      return baseStockQuantity;
    }
    if (matchedVariant) {
      return calculateVariantStock(matchedVariant, baseStockQuantity);
    }
    return 0;
  }, [processedVariants, matchedVariant, baseStockQuantity]);

  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && currentStock <= 5;

  // Max selectable quantity (capped at available stock, max 10, or flash sale limit)
  const maxAllowedQuantity = useMemo(() => {
    if (isOutOfStock) return 0;
    let limit = Math.min(Math.max(1, currentStock), 10);
    
    // Cap at flash sale remaining stock if active
    if (flashSale && flashSale.stock_allocated > flashSale.stock_sold) {
      const flashSaleRemaining = flashSale.stock_allocated - flashSale.stock_sold;
      limit = Math.min(limit, Math.max(1, flashSaleRemaining));
    }
    
    return limit;
  }, [isOutOfStock, currentStock, flashSale]);

  // Clamp quantity if stock changes
  useEffect(() => {
    if (maxAllowedQuantity > 0 && quantity > maxAllowedQuantity) {
      setQuantity(maxAllowedQuantity);
    } else if (maxAllowedQuantity === 0) {
      setQuantity(1);
    }
  }, [maxAllowedQuantity, quantity]);

  // 6. Determine dynamic price and SKU
  const currentSku = matchedVariant?.sku || productSku || "N/A";

  const { effectivePrice, compareAtPrice, isFlashActive } = useMemo(() => {
    const baseRegularPrice =
      matchedVariant?.price_override ??
      matchedVariant?.price ??
      productPrice;

    // Flash sale check
    if (flashSale && flashSale.stock_allocated > flashSale.stock_sold) {
      return {
        effectivePrice: flashSale.flash_price,
        compareAtPrice: baseRegularPrice,
        isFlashActive: true,
      };
    }

    // Variant sale price
    if (matchedVariant?.sale_price && matchedVariant.sale_price < baseRegularPrice) {
      return {
        effectivePrice: matchedVariant.sale_price,
        compareAtPrice: baseRegularPrice,
        isFlashActive: false,
      };
    }

    // Product sale price fallback
    if (productSalePrice && productSalePrice < baseRegularPrice) {
      return {
        effectivePrice: productSalePrice,
        compareAtPrice: baseRegularPrice,
        isFlashActive: false,
      };
    }

    return {
      effectivePrice: baseRegularPrice,
      compareAtPrice: null,
      isFlashActive: false,
    };
  }, [matchedVariant, productPrice, productSalePrice, flashSale]);

  // 7. Dynamic gallery filtering (variant-specific images)
  const variantGallery = useMemo(() => {
    if (!matchedVariant || !productMedia || productMedia.length === 0) {
      return productImages;
    }

    const variantMedia = productMedia.filter(
      (m) => m.variant_id === matchedVariant.id
    );

    if (variantMedia.length > 0) {
      return variantMedia
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((m) => m.url);
    }

    return productImages;
  }, [matchedVariant, productMedia, productImages]);

  // Notify parent component of changes
  useEffect(() => {
    if (onVariantChange) {
      onVariantChange({
        variant: matchedVariant,
        price: effectivePrice,
        compareAtPrice,
        sku: currentSku,
        images: variantGallery,
        stock: currentStock,
        isOutOfStock,
      });
    }
  }, [
    matchedVariant,
    effectivePrice,
    compareAtPrice,
    currentSku,
    variantGallery,
    currentStock,
    isOutOfStock,
    onVariantChange,
  ]);

  // 8. Handler for selecting an attribute option
  const handleSelectOption = useCallback(
    (dimensionName: string, value: string) => {
      const nextAttributes = {
        ...selectedAttributes,
        [dimensionName]: value,
      };

      // Check if this new combination exists in active variants
      const matchingVariant = processedVariants.find((v) => {
        if (!v.isActive) return false;
        return Object.entries(nextAttributes).every(
          ([k, vVal]) => v.attributes[k] === vVal
        );
      });

      if (matchingVariant) {
        setSelectedAttributes(nextAttributes);
        return;
      }

      // If invalid with other selections, look for an active variant that has this dimension's value
      const fallbackVariant = processedVariants.find(
        (v) => v.isActive && v.attributes[dimensionName] === value
      );

      if (fallbackVariant) {
        setSelectedAttributes({ ...fallbackVariant.attributes });
      } else {
        setSelectedAttributes(nextAttributes);
      }
    },
    [selectedAttributes, processedVariants]
  );

  // 9. Validation error for Add to Cart
  const hasVariants = processedVariants.length > 0;
  const validationError =
    hasVariants && !matchedVariant
      ? "Please select all required product options before adding to cart."
      : null;

  return (
    <div className="space-y-6">
      {/* Price & SKU Bar */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-semibold tracking-tight text-gray-950 font-sans">
            {formatCurrency(effectivePrice)}
          </span>
          {compareAtPrice && compareAtPrice > effectivePrice && (
            <>
              <span className="text-lg text-gray-400 line-through">
                {formatCurrency(compareAtPrice)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Save {formatCurrency(compareAtPrice - effectivePrice)} ({Math.round(((compareAtPrice - effectivePrice) / compareAtPrice) * 100)}% OFF)
              </span>
            </>
          )}
          {isFlashActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
              Flash Deal
            </span>
          )}
        </div>

        {/* Dynamic Product Code & SKU Display with Copy */}
        {currentSku && (
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 rounded-md text-xs font-medium tracking-wider text-zinc-500 uppercase">
            <span>Product Code:</span>
            <span className="text-zinc-900 font-mono font-bold">{currentSku}</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(currentSku);
                  toast.success(`Copied product code: ${currentSku}`);
                }
              }}
              title="Copy Product Code / SKU"
              className="ml-1 text-zinc-400 hover:text-zinc-800 transition-colors p-0.5 rounded hover:bg-zinc-200/60"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Stock & Delivery Indicator Status */}
      <div className="flex flex-wrap items-center gap-3">
        {isOutOfStock ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-xs font-semibold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Low Stock — Only {currentStock} left in stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            In Stock • Ready to Dispatch
          </span>
        )}

        {effectivePrice >= 999 && !isOutOfStock && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
            🚚 Free Express Shipping
          </span>
        )}
      </div>

      {/* Dynamic Attribute Selectors (Color, Size, etc.) */}
      {attributeDimensions.map((dimension) => {
        // Skip dummy single default attributes (e.g. Standard: Default)
        const isDummyDefault =
          dimension.values.length === 1 &&
          (dimension.values[0].toLowerCase() === "default" ||
            dimension.name.toLowerCase() === "standard");

        if (isDummyDefault) {
          return null;
        }

        const isColorDim = dimension.name.toLowerCase() === "color";
        const selectedValue = selectedAttributes[dimension.name];

        return (
          <div key={dimension.name} className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-900">
              <span>
                {dimension.name}:{" "}
                <span className="font-normal text-gray-600">
                  {selectedValue || "Select"}
                </span>
              </span>
              
              {dimension.name.toLowerCase() === "size" && sizeCharts.length > 0 && (
                <SizeGuideModal
                  sizeCharts={sizeCharts}
                  availableSizes={dimension.values}
                  selectedSize={selectedValue}
                  onSelectSize={(sizeVal) => {
                    // Similar logic to regular click
                    const nextAttributes = {
                      ...selectedAttributes,
                      [dimension.name]: sizeVal,
                    };
                    const fallbackVariant = processedVariants.find(
                      (v) => v.isActive && v.attributes[dimension.name] === sizeVal
                    );
                    if (fallbackVariant) {
                      setSelectedAttributes({ ...fallbackVariant.attributes });
                    } else {
                      setSelectedAttributes(nextAttributes);
                    }
                  }}
                />
              )}
            </div>

            <div
              role="radiogroup"
              aria-label={`Select ${dimension.name}`}
              className="flex flex-wrap gap-2.5"
            >
              {dimension.values.map((val) => {
                const isSelected = selectedValue === val;

                // Check availability: does ANY variant have this value alongside other selections?
                const matchingVariants = processedVariants.filter(
                  (v) => v.attributes[dimension.name] === val
                );

                const isAvailableCombination = matchingVariants.length > 0;
                const isCombinationOutOfStock =
                  isAvailableCombination &&
                  matchingVariants.every((v) => v.stock <= 0);

                if (isColorDim) {
                  // Premium Color Swatch
                  const colorHex = getFashionColorHex(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!isAvailableCombination}
                      onClick={() => handleSelectOption(dimension.name, val)}
                      title={val}
                      aria-label={`${dimension.name} ${val}${
                        !isAvailableCombination
                          ? " (Unavailable)"
                          : isCombinationOutOfStock
                            ? " (Out of Stock)"
                            : ""
                      }`}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
                        isSelected
                          ? "border-black shadow-md scale-110 ring-2 ring-[#C9A86A]/40"
                          : isAvailableCombination
                            ? "border-transparent ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105"
                            : "cursor-not-allowed border-transparent opacity-40 grayscale"
                      )}
                    >
                      <span
                        className="h-full w-full rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: colorHex }}
                      />
                      {/* Checkmark for selected */}
                      {isSelected && (
                        <Check className="absolute h-4 w-4 text-white drop-shadow-md mix-blend-difference" />
                      )}
                      {/* Visual diagonal slash for out-of-stock combination */}
                      {isCombinationOutOfStock && !isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-[2px] w-[120%] rotate-45 bg-gray-500 shadow-sm" />
                        </div>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!isAvailableCombination}
                    onClick={() => handleSelectOption(dimension.name, val)}
                    aria-label={`${dimension.name} ${val}${
                      !isAvailableCombination
                        ? " (Unavailable)"
                        : isCombinationOutOfStock
                          ? " (Out of Stock)"
                          : ""
                    }`}
                    className={cn(
                      "relative flex min-h-[44px] min-w-[44px] items-center justify-center px-4 text-xs font-bold uppercase tracking-[0.1em] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
                      isSelected
                        ? "border-2 border-black bg-black text-white shadow-sm scale-[1.02]"
                        : isAvailableCombination
                          ? "border border-gray-200 bg-white text-gray-800 hover:border-black hover:bg-gray-50"
                          : "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 text-gray-300 line-through",
                      isCombinationOutOfStock && !isSelected
                        ? "text-gray-400 bg-gray-50 opacity-60"
                        : ""
                    )}
                  >
                    <span>{val}</span>
                    {/* Visual diagonal slash for out-of-stock combination */}
                    {isCombinationOutOfStock && (
                      <span className="sr-only"> (Out of stock)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Validation warning if applicable */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-xs font-medium text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Product Actions: Quantity Selector + Add to Cart + Wishlist */}
      <div className="pt-2">
        <ProductActions
          productId={productId}
          selectedVariantId={matchedVariant?.id || null}
          disabled={isOutOfStock}
          productName={productName}
          productPrice={effectivePrice}
          productImage={variantGallery[0] || "/images/placeholder.webp"}
          quantity={quantity}
          onQuantityChange={setQuantity}
          maxQuantity={maxAllowedQuantity}
          isOutOfStock={isOutOfStock}
          validationError={validationError}
        />
      </div>
    </div>
  );
}
