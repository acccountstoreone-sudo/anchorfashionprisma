import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ArrowUpRight } from "lucide-react";
import { jost } from "@/lib/fonts";
import { Collection } from "@/types/catalog.types";

interface ExploreCollectionsProps {
  collections?: Collection[];
  categories?: any[];
}

export function ExploreCollections({
  collections = [],
}: ExploreCollectionsProps) {
  // Only genuine active collections created from admin
  const activeCollections = (collections || []).filter(
    (c) => c && c.id && c.is_active !== false
  );

  // If no active collections exist in the catalog yet, hide the section gracefully
  if (activeCollections.length === 0) {
    return null;
  }

  const displayItems = activeCollections;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12 flex flex-col items-center gap-3 text-center md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#C9A86A]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A86A]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curated For You</span>
          </div>
          <h2
            className={`${jost.className} max-w-2xl text-3xl font-light leading-tight tracking-tight text-zinc-900 md:text-5xl lg:text-6xl`}
          >
            Explore Collections.
          </h2>
          <p className="max-w-md text-sm font-light text-zinc-500">
            Discover seasonal wardrobes, handpicked capsule lines, and trendsetting style edits.
          </p>
          <Link
            href="/collections"
            className="group mt-2 flex items-center border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 transition-colors hover:border-[#C9A86A] hover:text-[#C9A86A]"
          >
            View All Collections
            <ArrowRight
              className="ml-2.5 h-4 w-4 transition-transform group-hover:translate-x-1.5"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8">
          {displayItems.slice(0, 4).map((item: any) => {
            const linkHref = `/collections/${item.slug}`;

            return (
              <div key={item.id} className="group relative flex flex-col">
                <Link
                  href={linkHref}
                  className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-sm transition-all duration-500 group-hover:shadow-2xl"
                >
                  {item.banner_url ? (
                    <Image
                      src={item.banner_url}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center p-4">
                      <div className="h-16 w-16 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-3">
                        <span className="text-xl font-light text-[#C9A86A] uppercase tracking-widest">
                          {item.name ? item.name.slice(0, 2) : "CL"}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Luxury Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-95" />

                  {/* Top Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20">
                      {item.product_count !== undefined && item.product_count > 0
                        ? `${item.product_count} ${item.product_count === 1 ? "Item" : "Items"}`
                        : "Capsule Edit"}
                    </span>
                  </div>

                  {/* Card Content Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end text-white z-10">
                    <h3 className={`${jost.className} text-2xl font-normal tracking-wide text-white group-hover:text-[#C9A86A] transition-colors`}>
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="mt-2 text-xs font-light text-zinc-300 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#C9A86A] transition-all group-hover:translate-x-1">
                      <span>Shop Capsule</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
