"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem as CartItemType } from "@/types/checkout.types";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { formatCurrency } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  isReadOnly?: boolean;
}

export function CartItem({ item, isReadOnly = false }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const { addItem: addToWishlist } = useWishlistStore();

  const product = item.product as any;
  const title = product?.name || product?.title || "Unknown Product";
  const price =
    item.variant?.sale_price ||
    item.variant?.price ||
    product?.sale_price ||
    product?.base_price ||
    product?.price ||
    0;
  const image =
    product?.product_media?.find((m: any) => m.is_primary)?.url ||
    product?.product_media?.[0]?.url ||
    product?.main_image_url ||
    "/images/placeholder.webp";
  const slug = product?.slug || "#";

  const handleDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      removeItem(item.id);
    }
  };

  const handleIncrease = () => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleRemove = () => {
    removeItem(item.id);
  };

  const handleSaveForLater = async () => {
    await addToWishlist(item.product_id, item.variant_id || null);
    removeItem(item.id);
  };

  return (
    <div className="flex py-6">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
        <Image
          src={image}
          alt={title}
          width={96}
          height={96}
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="ml-4 flex flex-1 flex-col">
        <div>
          <div className="flex justify-between text-base font-medium text-slate-900 dark:text-slate-100">
            <h3>
              <Link href={`/product/${slug}`}>{title}</Link>
            </h3>
            <p className="ml-4">{formatCurrency(price * item.quantity)}</p>
          </div>
          {item.variant && (
            <p className="mt-1 text-sm text-slate-500">
              {Object.entries(item.variant.attributes || {})
                .map(([key, val]) => `${key}: ${val}`)
                .join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-1 items-end justify-between text-sm">
          {isReadOnly ? (
            <p className="text-slate-500">Qty {item.quantity}</p>
          ) : (
            <div className="flex items-center space-x-2 rounded-md border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDecrease}
              >
                <Minus className="h-3 w-3" />
                <span className="sr-only">Decrease quantity</span>
              </Button>
              <span className="w-4 text-center">{item.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleIncrease}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">Increase quantity</span>
              </Button>
            </div>
          )}

          {!isReadOnly && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="font-medium text-slate-600 hover:text-slate-900"
                onClick={handleSaveForLater}
              >
                <Heart className="mr-2 h-4 w-4" />
                Save for later
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-medium text-rose-600 hover:text-rose-500"
                onClick={handleRemove}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
