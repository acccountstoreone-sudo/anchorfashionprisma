"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback } from "react";
import { ProductCard } from "@/components/product/product-card";
import { jost } from "@/lib/fonts";

export function TrendingProducts({ products }: { products: any[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: false,
      dragFree: true,
    },
    [Autoplay({ delay: 5500, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Remove any fake or dummy products
  const displayProducts =
    products?.filter((p) => p && p.id && !p.id.startsWith("dummy-") && !p.id.startsWith("featured-")) || [];

  if (displayProducts.length === 0) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 border-b border-zinc-100 pb-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A] mb-2 block">
              Most Wanted
            </span>
            <h2 className={`${jost.className} mb-2 text-3xl font-light tracking-tight text-zinc-900 md:text-5xl`}>
              Trending Now
            </h2>
            <p className="text-sm font-light text-zinc-500">
              Discover the signature pieces our community can&apos;t get enough of this season.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/products?sort=rating"
              className="group hidden items-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 transition-colors hover:text-[#C9A86A] md:flex"
            >
              View All Trending
              <ArrowRight
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </Link>
          </div>
        </div>

        <div className="group/carousel relative">
          <div className="-mx-3 overflow-hidden px-3" ref={emblaRef}>
            <div className="flex gap-4 sm:gap-6 py-2">
              {displayProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex-[0_0_72%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_25%] min-w-0"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Side Navigation Buttons */}
          {displayProducts.length > 4 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-0 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-800 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-black hover:text-white group-hover/carousel:opacity-100 -translate-x-3 md:-translate-x-5"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-0 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-800 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-black hover:text-white group-hover/carousel:opacity-100 translate-x-3 md:translate-x-5"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <Link
            href="/products?sort=rating"
            className="flex items-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 border-b border-black pb-1"
          >
            View All Trending
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
