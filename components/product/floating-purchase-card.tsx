"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/stores/use-cart-store";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth/client";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export interface FloatingPurchaseCardProps {
  productId: string;
  productName: string;
  productPrice: number;
  compareAtPrice?: number | null;
  productImage: string;
  selectedVariantId?: string | null;
  selectedVariantSku?: string;
  selectedVariantLabel?: string;
  isOutOfStock?: boolean;
  validationError?: string | null;
  quantity?: number;
}

export function FloatingPurchaseCard({
  productId,
  productName,
  productPrice,
  compareAtPrice,
  productImage,
  selectedVariantId,
  selectedVariantSku,
  selectedVariantLabel,
  isOutOfStock = false,
  validationError = null,
  quantity = 1,
}: FloatingPurchaseCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false);
  const { addItem, isLoading } = useCartStore();
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past main CTA (approx 600px)
      if (window.scrollY > 600) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = async () => {
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
            router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`),
        },
      });
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (isOutOfStock || isLoading || isBuyNowLoading) return;

    try {
      await addItem(productId, selectedVariantId || null, quantity);
      const storeError = useCartStore.getState().error;
      if (storeError) {
        toast.error(storeError);
      } else {
        toast.success(`Added ${productName} to bag`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add to bag.");
    }
  };

  const handleBuyNow = async () => {
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
            router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`),
        },
      });
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (isOutOfStock || isLoading || isBuyNowLoading) return;

    try {
      setIsBuyNowLoading(true);
      await addItem(productId, selectedVariantId || null, quantity);
      const storeError = useCartStore.getState().error;
      if (storeError) {
        toast.error(storeError);
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

  if (!isVisible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] hidden border-b border-zinc-200/80 bg-white/95 px-6 py-2.5 shadow-lg backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-full lg:block">
      <div className="container mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 shadow-xs">
            <Image
              src={productImage || "/images/placeholder.webp"}
              alt={productName}
              fill
              sizes="48px"
              className="object-cover object-center"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-zinc-900 max-w-md">
              {productName}
            </h3>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="text-xs font-bold text-zinc-950 font-sans">
                {formatCurrency(productPrice)}
              </span>
              {compareAtPrice && compareAtPrice > productPrice && (
                <>
                  <span className="text-[11px] text-zinc-400 line-through">
                    {formatCurrency(compareAtPrice)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                    {Math.round(((compareAtPrice - productPrice) / compareAtPrice) * 100)}% OFF
                  </span>
                </>
              )}
              {selectedVariantSku && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono hidden xl:inline">
                  SKU: {selectedVariantSku}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedVariantLabel && (
            <span className="text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200/80 px-2.5 py-1 rounded-md">
              {selectedVariantLabel}
            </span>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isLoading || isBuyNowLoading}
            className={cn(
              "border border-zinc-900 bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white rounded-md shadow-xs active:scale-95",
              isOutOfStock
                ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 shadow-none"
                : "",
              isLoading && "cursor-wait opacity-80"
            )}
          >
            {isLoading ? "Adding..." : "Add to Bag"}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock || isBuyNowLoading || isLoading}
            className={cn(
              "bg-[#111111] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-[#C9A86A] rounded-md shadow-sm active:scale-95",
              isOutOfStock
                ? "cursor-not-allowed bg-zinc-300 text-zinc-500 shadow-none"
                : "",
              isBuyNowLoading && "cursor-wait opacity-80"
            )}
          >
            {isBuyNowLoading ? "Processing..." : "Buy Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
