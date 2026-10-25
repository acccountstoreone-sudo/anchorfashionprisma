"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  ShoppingBag,
  Heart,
  Eye,
  Check,
  Tag,
  Boxes,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export interface StorefrontLivePreviewProps {
  name: string;
  categoryName?: string;
  brandName?: string;
  sku?: string;
  basePrice: number;
  salePrice?: number | null;
  costPrice?: number | null;
  media: Array<{ url?: string; altText?: string | null; isPrimary?: boolean; [key: string]: any }>;
  variants: Array<{
    attributes?: Record<string, any>;
    stockQuantity?: number;
    sku?: string;
    priceOverride?: number | null;
    [key: string]: any;
  }>;
  status?: string;
}

// Map common color names to CSS colors
const COLOR_MAP: Record<string, string> = {
  black: "#0f172a",
  white: "#f8fafc",
  navy: "#1e3a8a",
  "navy blue": "#1e3a8a",
  blue: "#2563eb",
  royal: "#1d4ed8",
  red: "#dc2626",
  maroon: "#881337",
  burgundy: "#701a75",
  green: "#15803d",
  olive: "#556b2f",
  grey: "#64748b",
  gray: "#64748b",
  charcoal: "#334155",
  beige: "#d4b996",
  cream: "#fef3c7",
  yellow: "#eab308",
  mustard: "#d97706",
  brown: "#78350f",
  khaki: "#c3b091",
  pink: "#ec4899",
  purple: "#9333ea",
  orange: "#ea580c",
};

export function StorefrontLivePreview({
  name,
  categoryName = "Fashion Apparel",
  brandName = "Anchor Fashion",
  sku,
  basePrice = 0,
  salePrice,
  costPrice,
  media = [],
  variants = [],
  status = "DRAFT",
}: StorefrontLivePreviewProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Determine main image
  const primaryMedia =
    media.find((m) => m?.isPrimary) || media[0] || null;
  const imageUrl = primaryMedia?.url || "/images/placeholder.webp";

  // Calculate pricing & discount
  const retailPrice = Number(basePrice) || 0;
  const discountPrice =
    salePrice !== undefined && salePrice !== null && Number(salePrice) > 0
      ? Number(salePrice)
      : null;
  const activePrice = discountPrice !== null ? discountPrice : retailPrice;
  const comparePrice = discountPrice !== null ? retailPrice : null;
  const discountPercent =
    comparePrice && comparePrice > activePrice
      ? Math.round(((comparePrice - activePrice) / comparePrice) * 100)
      : null;

  // Calculate gross profit
  const cost = Number(costPrice) || 0;
  const profit = activePrice - cost;
  const profitMargin =
    activePrice > 0 && cost > 0
      ? Math.round((profit / activePrice) * 100)
      : null;

  // Extract unique colors & sizes from variants
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();
  let totalStock = 0;

  variants.forEach((v) => {
    totalStock += Number(v.stockQuantity) || 0;
    const attrs = v.attributes || {};
    const color = attrs.Color || attrs.color || attrs.Colour || attrs.colour;
    const size = attrs.Size || attrs.size;
    if (color && typeof color === "string") colorSet.add(color.trim());
    if (size && typeof size === "string") sizeSet.add(size.trim());
  });

  const availableColors = Array.from(colorSet);
  const availableSizes = Array.from(sizeSet);

  const copyCode = () => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    toast.success(`Style code "${sku}" copied to clipboard!`);
  };

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-card to-muted/20 p-4 shadow-sm space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Storefront Live Preview
          </span>
        </div>
        <Badge
          variant="outline"
          className={
            status === "ACTIVE"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-semibold"
              : "border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-semibold"
          }
        >
          {status === "ACTIVE" ? "🟢 Live in Store" : "🟡 Draft (Hidden)"}
        </Badge>
      </div>

      {/* The Anchor Fashion Card Shell */}
      <div className="mx-auto max-w-[280px] rounded-2xl border border-border bg-card overflow-hidden shadow-md transition-all">
        {/* Image Container with Floating Badges */}
        <div className="relative aspect-[3/4] w-full bg-muted/30 overflow-hidden group">
          {imageUrl && imageUrl !== "/images/placeholder.webp" ? (
            <img
              src={imageUrl}
              alt={name || "Product Preview"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground/40 p-6 text-center">
              <Boxes className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-xs font-medium text-muted-foreground">
                Upload image to preview
              </p>
            </div>
          )}

          {/* Discount Badge */}
          {discountPercent && discountPercent > 0 && (
            <div className="absolute right-2.5 top-2.5 z-10 flex h-9 w-9 flex-col items-center justify-center rounded-full bg-[#E50000] text-white shadow-md">
              <span className="text-[11px] font-bold leading-none">
                {discountPercent}%
              </span>
              <span className="text-[7px] font-bold uppercase tracking-wider">
                OFF
              </span>
            </div>
          )}

          {/* Quick Floating Action Icons */}
          <div className="absolute right-2 top-12 z-10 flex flex-col gap-1.5 opacity-90">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur-md border border-border/40">
              <Heart className="h-3.5 w-3.5" />
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur-md border border-border/40">
              <Eye className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Stock Tag on Image Bottom */}
          <div className="absolute left-2.5 bottom-2.5 z-10">
            {totalStock > 5 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 backdrop-blur-md border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                In Stock ({totalStock})
              </span>
            ) : totalStock > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 backdrop-blur-md border border-amber-500/30">
                Low Stock ({totalStock})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900/80 text-zinc-400 backdrop-blur-md">
                Out of Stock
              </span>
            )}
          </div>
        </div>

        {/* Card Details Body */}
        <div className="p-3.5 space-y-2.5 bg-card">
          {/* Brand & Short Style Code Row */}
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="font-bold uppercase tracking-wider text-muted-foreground truncate">
              {brandName || "Anchor Fashion"}
            </span>

            {sku ? (
              <button
                type="button"
                onClick={copyCode}
                title="Click to copy style code"
                className="inline-flex items-center gap-1 font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <Tag className="h-2.5 w-2.5" />
                {sku}
                <Copy className="h-2.5 w-2.5 opacity-60 ml-0.5" />
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">
                No code yet
              </span>
            )}
          </div>

          {/* Product Name */}
          <h4 className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
            {name || "Untitled Product"}
          </h4>

          {/* Category Pill */}
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span>Category:</span>
            <span className="font-medium text-foreground">{categoryName}</span>
          </div>

          {/* Colors Strip */}
          {availableColors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-muted-foreground">Colors:</span>
              <div className="flex items-center gap-1">
                {availableColors.slice(0, 4).map((c) => {
                  const lower = c.toLowerCase();
                  const bg = COLOR_MAP[lower] || "#94a3b8";
                  return (
                    <span
                      key={c}
                      title={c}
                      style={{ backgroundColor: bg }}
                      className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-2xs inline-block"
                    />
                  );
                })}
                {availableColors.length > 4 && (
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    +{availableColors.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sizes Strip */}
          {availableSizes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] text-muted-foreground mr-1">
                Sizes:
              </span>
              {availableSizes.slice(0, 5).map((sz) => (
                <span
                  key={sz}
                  className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-muted text-foreground border border-border"
                >
                  {sz}
                </span>
              ))}
            </div>
          )}

          {/* Price & Add to Bag Preview */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(activePrice)}
              </span>
              {comparePrice && comparePrice > activePrice && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatCurrency(comparePrice)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <ShoppingBag className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* POS Profit Intelligence Summary */}
      {cost > 0 && activePrice > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Gross Profit / Unit:
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
              +৳{profit.toLocaleString()}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Profit Margin:
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
              {profitMargin}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
