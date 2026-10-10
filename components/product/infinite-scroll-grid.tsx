"use client";

import { useState, useEffect, useRef } from "react";
import { ProductCard } from "./product-card";

interface InfiniteScrollGridProps {
  products: any[];
  initialCount?: number;
}

export function InfiniteScrollGrid({
  products,
  initialCount = 12,
}: InfiniteScrollGridProps) {
  const [displayedCount, setDisplayedCount] = useState(
    Math.min(initialCount, products.length)
  );
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset displayed count when the products list changes (e.g. new filter applied)
  useEffect(() => {
    setDisplayedCount(Math.min(initialCount, products.length));
  }, [products, initialCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayedCount((prev) => Math.min(prev + 8, products.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [products.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, displayedCount).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {displayedCount < products.length && (
        <div ref={observerTarget} className="mt-16 flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </div>
      )}
    </>
  );
}
