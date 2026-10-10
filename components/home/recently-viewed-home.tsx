"use client";

import { usePersonalizationStore } from "@/stores/use-personalization-store";
import { ProductCard } from "@/components/product/product-card";
import { jost } from "@/lib/fonts";
import { useEffect, useState } from "react";

export function RecentlyViewedHome() {
  const { recentlyViewed } = usePersonalizationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || recentlyViewed.length === 0) return null;

  return (
    <section className="py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <h2 className={`${jost.className} mb-12 text-center text-3xl font-light tracking-tight text-[#1A1A1A]`}>
          Recently Viewed
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-4 md:gap-x-8">
          {recentlyViewed.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      </div>
    </section>
  );
}
