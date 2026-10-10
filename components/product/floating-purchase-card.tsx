"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/stores/use-cart-store";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";
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
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      currentUser = data?.user ?? null;
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
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      currentUser = data?.user ?? null;
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
    <div className="fixed left-0 right-0 top-0 z-50 hidden border-b border-gray-100 bg-white/95 px-6 py-2.5 shadow-md backdrop-blur-md transition-transform duration-300 animate-in slide-in-from-top-full lg:block">
      <div className="container mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-11 w-9 overflow-hidden bg-gray-100">
            <Image
              src={productImage || "/images/placeholder.webp"}
              alt={productName}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">{productName}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-[#1A1A1A]">
                {formatCurrency(productPrice)}
              </span>
              {compareAtPrice && (
                <span className="text-[11px] text-gray-400 line-through">
                  {formatCurrency(compareAtPrice)}
                </span>
              )}
              {selectedVariantSku && (
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  SKU: {selectedVariantSku}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedVariantLabel && (
            <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded">
              {selectedVariantLabel}
            </span>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isLoading || isBuyNowLoading}
            className={cn(
              "border border-black bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white",
              isOutOfStock
                ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
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
              "bg-[#1A1A1A] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#C9A86A]",
              isOutOfStock
                ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
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
