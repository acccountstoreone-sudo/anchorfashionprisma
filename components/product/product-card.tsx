"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Eye, Star, Loader2, Check } from "lucide-react";
import { jost } from "@/lib/fonts";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { useCartStore } from "@/stores/use-cart-store";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth/client";
import { useRouter, usePathname } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ProductQuickView } from "./product-quick-view";
import { ADMIN_ROLES } from "@/lib/constants/auth";

interface ProductCardProps {
  product: any;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSession();
  const { wishlist, addItem: addWishlistItem, removeItemByProductId } = useWishlistStore();
  const { addItem: addCartItem } = useCartStore();

  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Extract images: primary and secondary (for lookbook hover transition)
  const mediaList = product.product_media || product.media || product.images || [];
  const primaryMedia =
    (Array.isArray(mediaList) ? mediaList.find((m: any) => m?.is_primary || m?.isPrimary) : null) ||
    (Array.isArray(mediaList) ? mediaList[0] : null);

  const primaryImage =
    primaryMedia?.url ||
    product.imageUrl ||
    product.thumbnail ||
    (typeof primaryMedia === "string" ? primaryMedia : null) ||
    "/images/placeholder.webp";

  const displayImage = imageError ? "/images/placeholder.webp" : primaryImage;

  // Extract Pricing & Discounts
  const price = Number(product.sale_price ?? product.base_price ?? product.price ?? 0);
  const comparePrice = Number(
    product.compare_at_price ??
    product.compareAtPrice ??
    (product.discount > 0 ? (price / (1 - product.discount / 100)) : null) ??
    0
  );
  const hasDiscount = comparePrice > price;
  const discountPercent =
    product.discount ??
    (hasDiscount ? Math.round(((comparePrice - price) / comparePrice) * 100) : null);

  // Check wishlist state
  const isWished =
    wishlist?.items?.some((item) => item.product_id === product.id) || false;

  // Extract available sizes from variants (if any)
  const variants = product.variants || [];
  const availableSizes: string[] = Array.from(
    new Set(
      variants
        .map((v: any) => v.attributes?.size || v.attributes?.Size || v.size)
        .filter(Boolean)
    )
  );

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let currentUser = user;
    if (!currentUser) {
      const res = await authClient.getSession();
      currentUser = res?.data?.user ?? null;
    }

    if (!currentUser) {
      toast.info("Please log in to add items to your wishlist.");
      const redirectUrl = product.slug
        ? `/product/${product.slug}`
        : pathname || "/";
      router.push(`/auth/login?next=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    const role = currentUser?.user_metadata?.role || currentUser?.app_metadata?.role || "CUSTOMER";
    if (ADMIN_ROLES.includes(role)) {
      toast.error("Admin accounts cannot perform customer shopping actions.");
      return;
    }

    try {
      if (isWished) {
        await removeItemByProductId(product.id);
        toast.success("Removed from wishlist");
      } else {
        await addWishlistItem(product.id);
        toast.success("Added to wishlist ❤️");
      }
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent, variantId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    const role = user?.user_metadata?.role || user?.app_metadata?.role || "CUSTOMER";
    if (ADMIN_ROLES.includes(role)) {
      toast.error("Admin accounts cannot place customer orders. Please use the Admin Panel.");
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      const res = await authClient.getSession();
      currentUser = res?.data?.user ?? null;
    }

    if (!currentUser) {
      toast.info("Please log in to add items to your cart.", {
        action: {
          label: "Login",
          onClick: () =>
            router.push(
              `/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`
            ),
        },
      });
      router.push(
        `/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`
      );
      return;
    }

    let targetVariantId = variantId;
    if (!targetVariantId && variants.length > 0) {
      targetVariantId = variants[0]?.id || null;
    }

    setIsAddingToCart(true);
    try {
      await addCartItem(product.id, targetVariantId, 1);
      setAddedSuccess(true);
      toast.success(`${product.name} added to cart!`);
      setTimeout(() => setAddedSuccess(false), 2000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const openQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const brandName =
    product.brands?.name ||
    product.brand ||
    product.categories?.name ||
    "Anchor";

  const rating = Number(product.average_rating || product.rating || 0);

  return (
    <>
      <div
        className={cn(
          `${jost.className} group relative flex flex-col rounded-2xl bg-white border border-zinc-100/90 transition-all duration-300 hover:border-zinc-300/80 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.08)] overflow-hidden`,
          className
        )}
      >
        {/* Top Image Showcase */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F7F7F8]">
          <Link
            href={`/product/${product.slug}`}
            className="relative block h-full w-full"
            aria-label={`View ${product.name}`}
          >
            {/* Primary Image with smooth zoom */}
            <Image
              src={displayImage}
              alt={product.name || "Product"}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          </Link>



          {/* Discount Badge (Top Right) */}
          {hasDiscount && discountPercent !== null && discountPercent > 0 ? (
            <div className="absolute right-3 top-3 z-30 flex h-[42px] w-[42px] flex-col items-center justify-center rounded-full bg-[#E50000] shadow-md">
              <span className="text-[13px] font-bold leading-tight text-white">
                {discountPercent}%
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/95">
                OFF
              </span>
            </div>
          ) : null}

          {/* Floating Actions (Top Right, shifted down to accommodate badge) */}
          <div className="absolute right-2.5 top-12 z-20 flex flex-col gap-1.5">
            {/* Wishlist Button */}
            <button
              onClick={handleToggleWishlist}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white active:scale-95"
              aria-label="Save to wishlist"
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isWished ? "fill-red-600 text-red-600" : "text-zinc-700 hover:text-red-600"
                )}
                strokeWidth={1.75}
              />
            </button>

            {/* Quick View Button (Desktop hover reveal) */}
            <button
              onClick={openQuickView}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur-md opacity-0 -translate-y-1 transition-all duration-200 hover:scale-110 hover:bg-white hover:text-black group-hover:opacity-100 group-hover:translate-y-0 active:scale-95"
              aria-label="Quick preview"
              title="Quick View"
            >
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Sizes preview strip on hover (if sizes exist) */}
          {availableSizes.length > 0 && (
            <div className="hidden md:flex absolute bottom-14 inset-x-2 z-20 justify-center gap-1 opacity-0 translate-y-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <div className="flex flex-wrap items-center justify-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-lg border border-zinc-100">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                  Sizes:
                </span>
                {availableSizes.slice(0, 5).map((size) => {
                  const matchingVariant = variants.find(
                    (v: any) =>
                      v.attributes?.size === size ||
                      v.attributes?.Size === size ||
                      v.size === size
                  );
                  return (
                    <button
                      key={size}
                      onClick={(e) => handleQuickAdd(e, matchingVariant?.id || null)}
                      className="px-2 py-0.5 text-[10px] font-bold uppercase rounded text-zinc-800 hover:bg-black hover:text-white transition-colors"
                      title={`Add size ${size} to cart`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Quick Action Bar (Slide up on Desktop) */}
          <div className="absolute inset-x-0 bottom-0 z-20 hidden md:flex translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={openQuickView}
              className="flex flex-1 items-center justify-center gap-1.5 bg-zinc-900/95 py-3 text-white backdrop-blur-md transition-colors hover:bg-black text-[11px] font-semibold uppercase tracking-wider"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Quick View</span>
            </button>
            <div className="w-[1px] bg-white/10" />
            <button
              onClick={(e) => handleQuickAdd(e)}
              disabled={isAddingToCart}
              className="flex flex-1 items-center justify-center gap-1.5 bg-[#C9A86A]/95 py-3 text-white backdrop-blur-md transition-colors hover:bg-[#b8955e] text-[11px] font-semibold uppercase tracking-wider disabled:opacity-70"
            >
              {isAddingToCart ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : addedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Add To Bag</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="flex flex-1 flex-col p-3.5 sm:p-4 justify-between bg-white">
          <div>
            {/* Brand, Product Code & Rating Row */}
            <div className="flex items-center justify-between mb-1 gap-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400 group-hover:text-[#C9A86A] transition-colors truncate">
                  {brandName}
                </span>
                {product.sku && (
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600 rounded border border-zinc-200/80">
                    {product.sku}
                  </span>
                )}
              </div>

              {rating > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-700 shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Product Title */}
            <Link href={`/product/${product.slug}`} className="block">
              <h3 className="text-[13px] sm:text-sm font-normal text-zinc-800 line-clamp-1 group-hover:text-black transition-colors leading-tight">
                {product.name}
              </h3>
            </Link>
          </div>

          {/* Pricing & Mobile Quick Action */}
          <div className="mt-2.5 pt-2 border-t border-zinc-100/70 flex items-center justify-between">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[14px] sm:text-[15px] font-semibold text-zinc-900">
                {formatCurrency(price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] sm:text-xs text-zinc-400 line-through">
                  {formatCurrency(comparePrice)}
                </span>
              )}
            </div>

            {/* Mobile Instant Add Button */}
            <button
              onClick={(e) => handleQuickAdd(e)}
              disabled={isAddingToCart}
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white shadow transition-transform active:scale-90"
              aria-label="Add to cart"
            >
              {isAddingToCart ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : addedSuccess ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <ProductQuickView
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
