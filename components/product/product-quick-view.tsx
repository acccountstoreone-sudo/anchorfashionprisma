"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_ROLES } from "@/lib/constants/auth";
import {
  Heart,
  ShoppingBag,
  Star,
  Check,
  ArrowRight,
  Minus,
  Plus,
  Loader2,
  ShieldCheck,
  Truck,
  RotateCcw,
} from "lucide-react";
import { jost } from "@/lib/fonts";

interface ProductQuickViewProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductQuickView({
  product,
  isOpen,
  onClose,
}: ProductQuickViewProps) {
  const router = useRouter();
  const { user } = useSession();
  const { addItem: addCartItem } = useCartStore();
  const { wishlist, addItem: addWishlistItem, removeItemByProductId } = useWishlistStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  // Extract images
  const mediaList =
    product.product_media && product.product_media.length > 0
      ? product.product_media.map((m: any) => m.url)
      : product.images && product.images.length > 0
        ? product.images.map((img: any) => img.url || img)
        : [product.thumbnail || "/images/placeholder.webp"];

  const currentImage = mediaList[activeImageIndex] || mediaList[0];

  // Pricing calculation
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

  // Variants extraction
  const variants = product.variants || [];
  const sizes: string[] = Array.from(
    new Set(
      variants
        .map((v: any) => v.attributes?.size || v.attributes?.Size || v.size)
        .filter(Boolean)
    )
  );
  const colors: string[] = Array.from(
    new Set(
      variants
        .map((v: any) => v.attributes?.color || v.attributes?.Color || v.color)
        .filter(Boolean)
    )
  );

  const isWished =
    wishlist?.items?.some((item) => item.product_id === product.id) || false;

  const handleToggleWishlist = async () => {
    let currentUser = user;
    if (!currentUser) {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      currentUser = data?.user ?? null;
    }

    if (!currentUser) {
      toast.info("Please log in to add items to your wishlist.");
      onClose();
      router.push(`/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`);
      return;
    }

    const role = currentUser?.user_metadata?.role || currentUser?.app_metadata?.role || "CUSTOMER";
    if (ADMIN_ROLES.includes(role)) {
      toast.error("Admin accounts cannot perform customer shopping actions. Please use the Admin Panel.");
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

  const handleAddToCart = async () => {
    const role = user?.user_metadata?.role || user?.app_metadata?.role || "CUSTOMER";
    if (ADMIN_ROLES.includes(role)) {
      toast.error("Admin accounts cannot place customer orders. Please use the Admin Panel.");
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      currentUser = data?.user ?? null;
    }

    if (!currentUser) {
      toast.info("Please log in to add items to your cart.", {
        action: {
          label: "Login",
          onClick: () => {
            onClose();
            router.push(`/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`);
          },
        },
      });
      onClose();
      router.push(`/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`);
      return;
    }

    // If sizes exist and none selected, remind user
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size first");
      return;
    }

    setIsAdding(true);
    try {
      const variantId = selectedVariant?.id || null;
      await addCartItem(product.id, variantId, quantity);
      toast.success(`${product.name} added to cart!`);
      onClose();
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${jost.className} max-w-4xl p-0 overflow-hidden rounded-2xl bg-white border-0 shadow-2xl`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name} - Quick View</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Visual Gallery */}
          <div className="relative flex flex-col bg-zinc-50 p-6 md:p-8">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white shadow-inner">
              <Image
                src={currentImage}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center transition-all duration-300"
              />

              {/* Badges */}
              <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-10">
                {product.status === "NEW" && (
                  <span className="bg-black/90 text-white backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                    New
                  </span>
                )}
                {hasDiscount && discountPercent && (
                  <span className="bg-rose-600 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {/* Wishlist Button inside image */}
              <button
                onClick={handleToggleWishlist}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
                aria-label="Wishlist"
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isWished ? "fill-red-600 text-red-600" : "text-zinc-700 hover:text-red-600"
                  }`}
                  strokeWidth={2}
                />
              </button>
            </div>

            {/* Thumbnail Strip */}
            {mediaList.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {mediaList.map((thumbUrl: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      activeImageIndex === idx
                        ? "border-black shadow-sm"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={thumbUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details & Actions */}
          <div className="flex flex-col justify-between p-6 md:p-8">
            <div className="space-y-4">
              {/* Brand & Categories */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A86A]">
                  {product.brands?.name || product.categories?.name || "Anchor Fashion"}
                </span>

                {/* Rating */}
                {(product.average_rating || 4.8) && (
                  <div className="flex items-center gap-1 text-xs text-zinc-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-zinc-900">
                      {Number(product.average_rating || 4.8).toFixed(1)}
                    </span>
                    <span className="text-zinc-400">({product.reviews_count || 14})</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl md:text-2xl font-normal text-zinc-900 leading-snug">
                {product.name}
              </h2>

              {/* Price & Savings */}
              <div className="flex items-baseline gap-3 border-b border-zinc-100 pb-4">
                <span className="text-2xl font-semibold text-zinc-900">
                  {formatCurrency(price)}
                </span>
                {hasDiscount && (
                  <span className="text-base text-zinc-400 line-through">
                    {formatCurrency(comparePrice)}
                  </span>
                )}
                {hasDiscount && discountPercent && (
                  <span className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {/* Colors if available */}
              {colors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700">Color:</span>
                    <span className="font-semibold text-zinc-900">{selectedColor || "Select Color"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          selectedColor === c
                            ? "border-black bg-black text-white"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes if available */}
              {sizes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700">Size:</span>
                    <span className="font-semibold text-zinc-900">{selectedSize || "Select Size"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`min-w-[42px] rounded-lg border py-2 px-3 text-xs font-semibold uppercase transition-all ${
                          selectedSize === s
                            ? "border-black bg-black text-white shadow-sm"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-zinc-700">Quantity:</span>
                <div className="flex items-center w-32 border border-zinc-200 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold text-zinc-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="p-2 text-zinc-600 hover:bg-zinc-100 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 pt-6 border-t border-zinc-100">
              <Button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="w-full h-12 bg-black hover:bg-zinc-800 text-white font-medium text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding to Bag...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Add To Cart • {formatCurrency(price * quantity)}
                  </>
                )}
              </Button>

              <Link
                href={`/product/${product.slug}`}
                onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-zinc-500 hover:text-black transition-colors"
              >
                View Complete Product Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              {/* Service Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 text-center">
                <div className="flex flex-col items-center gap-1 p-1">
                  <Truck className="h-4 w-4 text-zinc-700" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-1">
                  <ShieldCheck className="h-4 w-4 text-zinc-700" />
                  <span>100% Authentic</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-1">
                  <RotateCcw className="h-4 w-4 text-zinc-700" />
                  <span>Easy Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
