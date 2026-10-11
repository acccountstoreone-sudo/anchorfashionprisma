"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Zap, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth/client";
import { ADMIN_ROLES } from "@/lib/constants/auth";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export interface ProductActionsProps {
  productId: string;
  selectedVariantId?: string | null;
  disabled?: boolean;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  maxQuantity?: number;
  isOutOfStock?: boolean;
  validationError?: string | null;
}

export function ProductActions({
  productId,
  selectedVariantId,
  disabled = false,
  productName,
  productPrice,
  productImage,
  quantity = 1,
  onQuantityChange,
  maxQuantity = 10,
  isOutOfStock = false,
  validationError = null,
}: ProductActionsProps) {
  const { addItem: addCartItem, isLoading: isCartLoading } = useCartStore();
  const {
    addItem: addWishlistItem,
    removeItemByProductId,
    wishlist,
    isLoading: isWishlistLoading,
  } = useWishlistStore();
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false);

  const isWished =
    wishlist?.items?.some((item) => item.product_id === productId) || false;

  const handleAddToCart = async () => {
    const role = user?.user_metadata?.role || user?.app_metadata?.role || "CUSTOMER";
    if (ADMIN_ROLES.includes(role)) {
      toast.error("Admin accounts cannot perform customer shopping actions. Please use the Admin Panel.");
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
            router.push(`/auth/login?next=${encodeURIComponent(pathname)}`),
        },
      });
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (isOutOfStock || disabled || isCartLoading || isBuyNowLoading) {
      return;
    }

    try {
      await addCartItem(productId, selectedVariantId || null, quantity);
      const storeState = useCartStore.getState();
      if (storeState.error) {
        toast.error(storeState.error);
      } else {
        toast.success(`Added ${quantity > 1 ? `${quantity}x ` : ""}${productName || "item"} to bag`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add to bag.");
    }
  };

  const handleBuyNow = async () => {
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
      toast.info("Please log in to proceed with Buy Now.", {
        action: {
          label: "Login",
          onClick: () =>
            router.push(`/auth/login?next=${encodeURIComponent(pathname)}`),
        },
      });
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (isOutOfStock || disabled || isCartLoading || isBuyNowLoading) {
      return;
    }

    try {
      setIsBuyNowLoading(true);
      await addCartItem(productId, selectedVariantId || null, quantity);
      const storeState = useCartStore.getState();
      if (storeState.error) {
        toast.error(storeState.error);
        setIsBuyNowLoading(false);
      } else {
        toast.success("Proceeding to checkout...");
        router.push("/checkout");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to proceed to checkout.");
      setIsBuyNowLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    let currentUser = user;
    if (!currentUser) {
      const res = await authClient.getSession();
      currentUser = res?.data?.user ?? null;
    }

    if (!currentUser) {
      toast.info("Please log in to add items to your wishlist.");
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const role = currentUser?.user_metadata?.role || currentUser?.app_metadata?.role || "CUSTOMER";
    if (ADMIN_ROLES.includes(role)) {
      toast.error("Admin accounts cannot perform customer shopping actions. Please use the Admin Panel.");
      return;
    }

    try {
      if (isWished) {
        await removeItemByProductId(productId);
        toast.success("Removed from wishlist");
      } else {
        await addWishlistItem(productId, selectedVariantId || null);
        toast.success("Saved to wishlist ❤️");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update wishlist.");
    }
  };

  const handleDecrease = () => {
    if (quantity > 1 && onQuantityChange) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity && onQuantityChange) {
      onQuantityChange(quantity + 1);
    }
  };

  const effectiveDisabled = isOutOfStock || disabled;

  return (
    <>
      <div ref={actionsRef} className="space-y-3.5">
        {/* Row 1: Quantity Picker + Add to Bag + Wishlist */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Quantity Stepper */}
          <div
            className={cn(
              "flex h-[52px] w-full sm:w-36 items-center justify-between border border-gray-200 bg-white transition-opacity",
              effectiveDisabled ? "opacity-50 pointer-events-none" : ""
            )}
            role="group"
            aria-label="Quantity Selector"
          >
            <button
              type="button"
              onClick={handleDecrease}
              disabled={effectiveDisabled || quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-full w-12 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className="flex-1 text-center text-sm font-semibold text-zinc-900 select-none"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrease}
              disabled={effectiveDisabled || quantity >= maxQuantity}
              aria-label="Increase quantity"
              className="flex h-full w-12 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Bag Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={effectiveDisabled || isCartLoading || isBuyNowLoading}
            className={cn(
              "group flex h-[52px] flex-1 items-center justify-center gap-2 border border-black bg-white px-6 text-[13px] font-bold uppercase tracking-[0.15em] text-black transition-all",
              effectiveDisabled
                ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
                : "hover:bg-black hover:text-white active:scale-[0.98]",
              isCartLoading ? "cursor-wait opacity-80" : ""
            )}
          >
            <ShoppingBag className="h-[18px] w-[18px] transition-transform group-hover:scale-110" strokeWidth={1.5} />
            <span>
              {isCartLoading
                ? "Adding..."
                : isOutOfStock
                  ? "Out of Stock"
                  : "Add to Bag"}
            </span>
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            disabled={isWishlistLoading}
            aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border border-gray-200 transition-colors hover:border-black bg-white"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-transform hover:scale-110",
                isWished ? "fill-[#E50000] text-[#E50000]" : "text-black hover:text-[#E50000]"
              )}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Row 2: Prominent Buy Now Button */}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={effectiveDisabled || isBuyNowLoading || isCartLoading}
          className={cn(
            "group flex h-[56px] w-full items-center justify-center gap-2.5 px-8 text-[13px] font-bold uppercase tracking-[0.2em] text-white shadow-md transition-all",
            effectiveDisabled
              ? "cursor-not-allowed bg-zinc-300 text-zinc-500 shadow-none"
              : "bg-[#111111] hover:bg-[#C9A86A] active:scale-[0.99] hover:shadow-lg",
            isBuyNowLoading ? "cursor-wait opacity-80" : ""
          )}
        >
          <Zap className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
          <span>
            {isBuyNowLoading
              ? "Securing Checkout..."
              : isOutOfStock
                ? "Item Unavailable"
                : "Buy It Now"}
          </span>
        </button>

        {/* Trust Note under buttons */}
        <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-gray-500 font-light">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C9A86A]" />
            Cash on Delivery Available
          </span>
          <span>•</span>
          <span>Fast Doorstep Delivery</span>
        </div>
      </div>

      {/* Sticky Mobile Bottom Bar: Dual Actions */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transform border-t border-gray-100 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-2xl transition-transform duration-300 md:hidden",
          "pb-[max(env(safe-area-inset-bottom),0.75rem)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0 max-w-[35%]">
            {productImage && (
              <div className="relative h-11 w-9 shrink-0 overflow-hidden bg-gray-100">
                <Image
                  src={productImage}
                  alt={productName || "Product"}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="truncate text-[11px] font-medium text-gray-900 leading-tight">
                {productName}
              </span>
              {productPrice !== undefined && (
                <span className="text-xs font-bold text-[#1A1A1A]">
                  {formatCurrency(productPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              type="button"
              className={cn(
                "flex h-11 flex-1 items-center justify-center border border-black bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-black transition-colors",
                effectiveDisabled
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "hover:bg-gray-50",
                isCartLoading ? "cursor-wait opacity-80" : ""
              )}
              onClick={handleAddToCart}
              disabled={effectiveDisabled || isCartLoading || isBuyNowLoading}
            >
              {isCartLoading ? "Adding..." : "Add to Bag"}
            </button>

            <button
              type="button"
              className={cn(
                "flex h-11 flex-1 items-center justify-center bg-[#1A1A1A] px-3 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#C9A86A]",
                effectiveDisabled
                  ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                  : "",
                isBuyNowLoading ? "cursor-wait opacity-80" : ""
              )}
              onClick={handleBuyNow}
              disabled={effectiveDisabled || isBuyNowLoading || isCartLoading}
            >
              {isBuyNowLoading ? "Processing..." : "Buy Now"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
