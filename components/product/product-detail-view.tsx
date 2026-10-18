"use client";

import { useState, useMemo, useCallback } from "react";
import { ProductGallery, GalleryImageInput } from "@/components/product/ProductGallery";
import {
  ProductVariantSelector,
  VariantChangeInfo,
  FlashSaleInfo,
} from "@/components/product/product-variant-selector";
import { FloatingPurchaseCard } from "@/components/product/floating-purchase-card";
import { ProductViewTracker } from "@/components/product/product-view-tracker";
import { ProductReviews } from "@/components/product/product-reviews";
import { ProductCard } from "@/components/product/product-card";
import {
  Truck,
  RefreshCw,
  ShieldCheck,
  Ruler,
  Info,
  Sparkles,
  Share2,
  Check,
  Flame,
  CreditCard,
  ChevronRight,
  PackageCheck,
  Clock,
  Layers,
  Award,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { jost } from "@/lib/fonts";
import { toast } from "sonner";

export interface ProductDetailViewProps {
  product: any;
  flashSale?: FlashSaleInfo | null;
  reviews?: any[];
  relatedProducts?: any[];
}

export function ProductDetailView({
  product,
  flashSale = null,
  reviews = [],
  relatedProducts = [],
}: ProductDetailViewProps) {
  // Base gallery images & media items from product_media
  const baseGalleryItems: GalleryImageInput[] = useMemo(() => {
    const media = product.product_media || [];
    if (media.length > 0) {
      return [...media]
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((m: any) => ({
          id: m.id,
          url: m.url,
          alt_text: m.alt_text || `${product.name} — Luxury Apparel`,
          is_primary: m.is_primary,
          media_type: m.media_type,
        }));
    }
    return ["/images/placeholder.webp"];
  }, [product.product_media, product.name]);

  // Dynamic state governed by variant selection
  const [currentGalleryImages, setCurrentGalleryImages] =
    useState<GalleryImageInput[]>(baseGalleryItems);

  const [currentPrice, setCurrentPrice] = useState<number>(
    flashSale?.flash_price ?? product.sale_price ?? product.base_price
  );
  const [comparePrice, setComparePrice] = useState<number | null>(
    flashSale || product.sale_price ? product.base_price : null
  );
  const [currentSku, setCurrentSku] = useState<string>(product.sku || "");
  const initialStock =
    product.total_available_stock ?? (product.is_in_stock ? 10 : 0);
  const [currentStock, setCurrentStock] = useState<number>(initialStock);
  const [isOutOfStock, setIsOutOfStock] = useState<boolean>(
    !product.is_in_stock || initialStock <= 0
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Modern Web Share API with Clipboard Fallback
  const handleShare = async () => {
    if (typeof window !== "undefined") {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${product.name} | Anchor Fashion`,
            text: `Discover ${product.name} at Anchor Fashion — luxury apparel & modern essentials.`,
            url: window.location.href,
          });
          return;
        } catch {
          // User dismissed share dialog or fallback
        }
      }
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Product link copied to clipboard! ✨");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Scroll to reviews section smoothly
  const scrollToReviews = (e: React.MouseEvent) => {
    e.preventDefault();
    const reviewsEl = document.getElementById("customer-reviews");
    if (reviewsEl) {
      reviewsEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Callback when variant changes in ProductVariantSelector
  const handleVariantChange = useCallback(
    (info: VariantChangeInfo) => {
      setCurrentPrice(info.price);
      setComparePrice(info.compareAtPrice);
      setCurrentSku(info.sku);
      setCurrentStock(info.stock);
      setIsOutOfStock(info.isOutOfStock);
      setSelectedVariantId(info.variant?.id || null);

      if (info.images && info.images.length > 0) {
        setCurrentGalleryImages(info.images);
      } else {
        setCurrentGalleryImages(baseGalleryItems);
      }

      if (info.variant) {
        const attrs = info.variant.attributes;
        if (attrs && typeof attrs === "object") {
          const label = Object.entries(attrs)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" / ");
          setSelectedVariantLabel(label);
        } else {
          setSelectedVariantLabel(info.variant.sku || "Standard");
        }
      } else {
        setSelectedVariantLabel("");
      }
    },
    [baseGalleryItems]
  );

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
        totalReviews
      : product.average_rating || 0;

  const discountPercent =
    comparePrice && comparePrice > currentPrice
      ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
      : null;

  return (
    <div className="min-h-screen bg-[#FCFCFD] pb-24 pt-3">
      {/* Analytics & View Tracking */}
      <ProductViewTracker product={product} />

      {/* Floating Purchase Card for Desktop Viewport */}
      <FloatingPurchaseCard
        productId={product.id}
        productName={product.name}
        productPrice={currentPrice}
        compareAtPrice={comparePrice}
        productImage={
          typeof currentGalleryImages[0] === "string"
            ? currentGalleryImages[0]
            : (currentGalleryImages[0] as any)?.url || "/images/placeholder.webp"
        }
        selectedVariantId={selectedVariantId}
        selectedVariantSku={currentSku}
        selectedVariantLabel={selectedVariantLabel}
        isOutOfStock={isOutOfStock}
      />

      <div className="container mx-auto px-4 py-4 md:px-6 md:py-8 max-w-7xl">
        {/* Luxury Breadcrumb Bar */}
        <nav
          aria-label="Breadcrumbs"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400"
        >
          <Link href="/" className="transition-colors hover:text-black">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <Link href="/products" className="transition-colors hover:text-black">
            Catalog
          </Link>
          {product.categories && (
            <>
              <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
              <Link
                href={`/products?category=${product.categories.slug}`}
                className="transition-colors hover:text-black max-w-[140px] truncate"
              >
                {product.categories.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <span className="truncate max-w-[220px] text-zinc-900 font-semibold">
            {product.name}
          </span>
        </nav>

        {/* Main PDP Grid */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Interactive High Fashion Product Gallery */}
          <div className="relative w-full lg:col-span-7">
            <ProductGallery
              images={currentGalleryImages}
              productName={product.name}
              discountPercent={discountPercent}
              initialViewMode="carousel"
            />
          </div>

          {/* Right Column: Sticky Product Details & Purchase Architecture */}
          <div className="sticky top-20 flex flex-col lg:col-span-5">
            {/* Header: Brand, Title, Rating, Share */}
            <div className="border-b border-zinc-200/80 pb-6">
              {/* Top Subhead Row */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  {product.brands ? (
                    <Link
                      href={`/products?brand=${product.brands.slug}`}
                      className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#C9A86A] hover:text-black transition-colors"
                    >
                      {product.brands.name}
                    </Link>
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#C9A86A]">
                      Anchor Atelier
                    </span>
                  )}

                  <span className="text-zinc-300">•</span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    New Season
                  </span>
                </div>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share product"
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-3 py-1 text-xs text-zinc-600 shadow-sm transition-all hover:border-black hover:text-black active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[11px] text-emerald-600 font-semibold">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium">Share</span>
                    </>
                  )}
                </button>
              </div>

              {/* Product Title */}
              <h1
                className={`${jost.className} mb-3 text-3xl font-normal capitalize leading-[1.12] tracking-tight text-[#111111] md:text-4xl lg:text-[40px]`}
              >
                {product.name}
              </h1>

              {/* Rating & Review Counter Summary */}
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <a
                  href="#customer-reviews"
                  onClick={scrollToReviews}
                  className="group flex items-center gap-2 transition-colors hover:text-black"
                >
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.floor(averageRating > 0 ? averageRating : 5)
                            ? "fill-current"
                            : "fill-muted text-gray-200"
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold text-zinc-800 underline-offset-4 group-hover:underline">
                    {averageRating > 0 ? averageRating.toFixed(1) : "5.0"}
                  </span>
                  <span className="text-zinc-400">
                    ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </a>

                {/* Instant In-Stock Assurance */}
                {!isOutOfStock && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>In Stock & Ready</span>
                  </span>
                )}
              </div>

              {/* Live Interest & High Demand Banner */}
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-orange-200/70 bg-gradient-to-r from-orange-50/90 to-amber-50/70 px-3.5 py-2.5 text-xs text-orange-950 shadow-sm">
                <Flame className="h-4 w-4 text-orange-600 animate-pulse shrink-0" />
                <span>
                  High demand piece: <strong>14 shoppers</strong> are viewing this right now.
                </span>
              </div>
            </div>

            {/* Variant Selector + Price & Dynamic SKU + Add to Cart */}
            <div className="my-6">
              <ProductVariantSelector
                productId={product.id}
                baseStockQuantity={product.total_available_stock ?? 0}
                variants={product.variants || []}
                productName={product.name}
                productPrice={product.base_price}
                productSalePrice={product.sale_price}
                productSku={product.sku}
                productImages={
                  typeof currentGalleryImages[0] === "string"
                    ? (currentGalleryImages as string[])
                    : (currentGalleryImages as any[]).map((m) => m.url || m)
                }
                productMedia={product.product_media || []}
                flashSale={flashSale}
                sizeCharts={product.size_charts || []}
                onVariantChange={handleVariantChange}
              />
            </div>

            {/* Structured Specifications Grid */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-[#C9A86A]" />
                <span>Product Specifications</span>
              </h3>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                {product.material && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                      Fabric
                    </span>
                    <span className="font-medium text-zinc-800">
                      {product.material}
                    </span>
                  </div>
                )}
                {product.gender && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                      Department
                    </span>
                    <span className="font-medium text-zinc-800 capitalize">
                      {product.gender.toLowerCase()}
                    </span>
                  </div>
                )}
                {product.season && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                      Collection
                    </span>
                    <span className="font-medium text-zinc-800">
                      {product.season}
                    </span>
                  </div>
                )}
                {product.country_of_origin && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                      Origin
                    </span>
                    <span className="font-medium text-zinc-800">
                      {product.country_of_origin}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                    Authenticity
                  </span>
                  <span className="font-medium text-zinc-800">
                    100% Certified Original
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                    Payment
                  </span>
                  <span className="font-medium text-zinc-800">
                    Cash on Delivery (COD)
                  </span>
                </div>
              </div>
            </div>

            {/* Accordions: Description, Shipping & Care */}
            <div className="divide-y divide-zinc-200/80 border-t border-zinc-200/80 mt-6">
              <details className="group" open>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs font-bold uppercase tracking-widest text-[#111111]">
                  <span>Design &amp; Silhouette</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <svg
                      fill="none"
                      height="18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      width="18"
                    >
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="space-y-3 pb-5 text-sm leading-relaxed text-zinc-600">
                  <p>
                    {product.description ||
                      product.short_description ||
                      "Crafted from premium hand-selected fabrics, this silhouette combines timeless architectural elegance with modern ease for versatile luxury styling."}
                  </p>
                  {product.care_instructions && (
                    <div className="pt-2 text-xs">
                      <span className="font-semibold text-zinc-900">
                        Care Instructions:
                      </span>{" "}
                      <span>{product.care_instructions}</span>
                    </div>
                  )}
                </div>
              </details>

              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs font-bold uppercase tracking-widest text-[#111111]">
                  <span>Express Delivery &amp; Returns</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <svg
                      fill="none"
                      height="18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      width="18"
                    >
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="space-y-3 pb-5 text-sm text-zinc-600">
                  <div className="flex items-start gap-3">
                    <Truck className="h-4 w-4 text-[#111111] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span>
                      <strong>Express Delivery:</strong> 24–48 hours inside Dhaka; 2–4 days across all 64 districts nationwide.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-4 w-4 text-[#111111] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span>
                      <strong>7-Day Hassle-Free Returns:</strong> Try on in the comfort of your home. Easy size exchange &amp; doorstep pickup.
                    </span>
                  </div>
                </div>
              </details>
            </div>

            {/* 4-Pillar Luxury Guarantee Cards */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-xs">
                <Clock className="h-4 w-4 text-[#C9A86A] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <strong className="block text-zinc-900">24-48h Delivery</strong>
                  <span className="text-zinc-500">Dhaka &amp; Nationwide</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-xs">
                <CreditCard className="h-4 w-4 text-[#C9A86A] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <strong className="block text-zinc-900">Cash on Delivery</strong>
                  <span className="text-zinc-500">Pay at your doorstep</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-xs">
                <RefreshCw className="h-4 w-4 text-[#C9A86A] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <strong className="block text-zinc-900">7-Day Exchange</strong>
                  <span className="text-zinc-500">Hassle-free size swaps</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-xs">
                <ShieldCheck className="h-4 w-4 text-[#C9A86A] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <strong className="block text-zinc-900">100% Authentic</strong>
                  <span className="text-zinc-500">Handcrafted quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div id="customer-reviews" className="scroll-mt-24">
        <ProductReviews
          productId={product.id}
          productName={product.name}
          averageRating={Number(averageRating.toFixed(1))}
          totalReviews={totalReviews}
          reviews={reviews}
        />
      </div>

      {/* Related Products Carousel / Grid */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="border-t border-zinc-200/80 py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="text-center mb-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A] block mb-2">
                Curated Suggestions
              </span>
              <h2
                className={`${jost.className} text-2xl font-light tracking-tight text-[#111111] md:text-4xl`}
              >
                Complete The Look
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-4 md:gap-x-8">
              {relatedProducts.slice(0, 4).map((relProduct: any) => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
