"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, KeyboardEvent } from "react";
import { ProductCard } from "@/components/product/product-card";
import { jost } from "@/lib/fonts";

export function BrandedCollection({ 
  products,
  title = "Womens Collection",
  subtitle = "Womens",
  viewAllLink = "/products"
}: { 
  products?: any[];
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    dragFree: true,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  // Filter out any fake/dummy items
  const displayProducts =
    products?.filter((p) => p && p.id && !p.id.startsWith("dummy-") && !p.id.startsWith("featured-")) || [];

  // Gracefully return null if no real products exist for this collection
  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12 md:py-20" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-zinc-100 pb-5 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
              {subtitle}
            </span>
            <h2 className={`${jost.className} text-2xl font-light tracking-tight text-zinc-900 md:text-4xl`}>
              {title}
            </h2>
          </div>

          <Link
            href={viewAllLink}
            className="group hidden items-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 transition-colors hover:text-[#C9A86A] md:flex"
          >
            Explore {subtitle}
            <ArrowRight
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        {/* Carousel Grid */}
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
                aria-label={`Previous ${title}`}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-0 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-800 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-black hover:text-white group-hover/carousel:opacity-100 translate-x-3 md:translate-x-5"
                aria-label={`Next ${title}`}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 flex justify-center md:hidden">
          <Link
            href={viewAllLink}
            className="flex items-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 border-b border-black pb-1"
          >
            Explore {subtitle}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
