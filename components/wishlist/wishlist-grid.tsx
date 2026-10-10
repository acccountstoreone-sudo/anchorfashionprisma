"use client";

import { useWishlistStore } from "@/stores/use-wishlist-store";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Heart, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/use-cart-store";

export function WishlistGrid() {
  const { wishlist, fetchWishlist, removeItem, moveToCart, isLoading } =
    useWishlistStore();
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (itemId: string) => {
    await removeItem(itemId);
    toast.success("Removed from wishlist");
  };

  const handleMoveToCart = async (
    itemId: string,
    productId: string,
    variantId?: string | null
  ) => {
    setMovingItemId(itemId);
    const toastId = toast.loading("Moving to cart...");
    try {
      await moveToCart(itemId, productId, variantId);
      await useCartStore.getState().fetchCart();
      useCartStore.getState().setSheetOpen(true);
      toast.success("Moved to shopping cart!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to move to cart", { id: toastId });
    } finally {
      setMovingItemId(null);
    }
  };

  if (isLoading && (!wishlist || !wishlist.items)) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex animate-pulse flex-col space-y-3">
            <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  const items = wishlist?.items || [];

  if (items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed text-center">
        <Heart className="mb-4 h-16 w-16 text-slate-300" />
        <h3 className="mb-2 text-xl font-semibold">Your wishlist is empty</h3>
        <p className="mb-6 text-slate-500">
          Save items you love and buy them later.
        </p>
        <Button asChild className="rounded-full bg-black px-8 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#C9A86A]">
          <Link href="/products">Explore Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const product = item.product as any;
        const title = product?.name || product?.title || "Unknown Product";
        const price = product?.base_price || product?.price || 0;
        const image =
          product?.product_media?.find((m: any) => m.is_primary)?.url ||
          product?.product_media?.[0]?.url ||
          product?.main_image_url ||
          "/images/placeholder.webp";
        const slug = product?.slug || "#";

        return (
          <div
            key={item.id}
            className="group relative rounded-xl border bg-white p-4 transition-shadow hover:shadow-lg dark:bg-slate-950"
          >
            <div className="relative mb-4 aspect-square overflow-hidden rounded-md bg-slate-100">
              <Image
                src={image}
                alt={title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <button
                onClick={() => handleRemove(item.id)}
                className="absolute right-2 top-2 rounded-full bg-white/80 p-2 transition-colors hover:text-rose-500 dark:bg-black/50"
                title="Remove from Wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Mock Badges for UI */}
              <div className="absolute left-2 top-2 flex flex-col gap-1.5">
                {item.id.includes("1") && (
                  <span className="bg-rose-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 shadow-sm">
                    Price Drop
                  </span>
                )}
                {item.id.includes("2") && (
                  <span className="bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 shadow-sm">
                    Back in Stock
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4 space-y-1">
              <Link
                href={`/product/${slug}`}
                className="line-clamp-1 font-medium hover:underline"
              >
                {title}
              </Link>
              <p className="text-sm font-semibold">{formatCurrency(price)}</p>
            </div>

            <Button
              className="w-full bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold uppercase tracking-widest"
              disabled={movingItemId === item.id}
              onClick={() =>
                handleMoveToCart(item.id, item.product_id, item.variant_id)
              }
            >
              {movingItemId === item.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Move to Cart
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
