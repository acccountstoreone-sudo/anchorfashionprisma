"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { jost } from "@/lib/fonts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export function RedProductCard({ product }: { product: any }) {
  const imageSrc =
    product.images?.[0]?.url ||
    product.product_media?.[0]?.url ||
    "/images/placeholder.webp";
  const slug = product.slug || product.id;
  const price = product.base_price ?? product.price ?? 0;
  const comparePrice = product.compare_at_price ?? product.compareAtPrice;
  const discountPct =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  return (
    <div
      className={`${jost.className} group relative w-full overflow-hidden border border-gray-100 bg-white transition-all duration-500 hover:border-[#C9A86A]/30 hover:shadow-xl`}
    >
      {/* Image Container */}
      <div className="relative h-[300px] w-full overflow-hidden bg-[#F8F7F4] md:h-[400px]">
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Discount Badge */}
        {discountPct && (
          <div className="absolute left-3 top-3 z-10 bg-[#C9A86A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            -{discountPct}%
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toast.success(`${product.name} added to Wishlist!`);
          }}
          className="absolute right-3 top-3 z-10 -translate-y-1 bg-white/80 p-2 text-gray-400 opacity-0 backdrop-blur-sm transition-all transition-colors duration-300 hover:text-red-500 group-hover:translate-y-0 group-hover:opacity-100"
          aria-label="Add to Wishlist"
        >
          <Heart className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* Slide-up Action */}
        <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-full transition-transform duration-500 ease-out group-hover:translate-y-0">
          <button
            onClick={() => toast.success(`${product.name} added to cart!`)}
            className="flex w-full items-center justify-center gap-2 bg-[#1A1A1A] py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-colors duration-300 hover:bg-[#C9A86A]"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
            Add to Cart
          </button>
        </div>
      </div>

      {/* Product Info */}
      <Link href={`/product/${slug}`} className="block p-4">
        <h3 className="line-clamp-1 text-sm font-medium text-[#1A1A1A] transition-colors group-hover:text-[#C9A86A]">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-[#1A1A1A]">
            {formatCurrency(price)}
          </span>
          {comparePrice && comparePrice > price && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(comparePrice)}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
