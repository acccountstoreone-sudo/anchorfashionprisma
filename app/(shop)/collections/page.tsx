import Link from "next/link";
import { ArrowRight, Sparkles, FolderHeart } from "lucide-react";
import { jost } from "@/lib/fonts";
import { getCachedCollections } from "@/lib/cache/catalog-cache";

export const revalidate = 60;

export const metadata = {
  title: "Collections | Anchor Fashion Enterprise",
  description: "Browse all curated fashion collections and style lines at Anchor Fashion.",
};

export default async function CollectionsIndexPage() {
  const collections = await getCachedCollections(true);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-16 text-center md:px-6 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#C9A86A]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A86A] mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curated Catalog</span>
          </div>
          <h1
            className={`${jost.className} text-4xl font-light tracking-tight text-neutral-900 sm:text-5xl md:text-6xl max-w-2xl mx-auto`}
          >
            All Collections.
          </h1>
          <p className="mt-4 max-w-lg mx-auto text-sm text-muted-foreground font-light md:text-base">
            Explore our curated seasonal wardrobes, handpicked capsule drops, and contemporary style edits.
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="container mx-auto px-4 pt-12 md:px-6">
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8">
            {collections.map((col) => (
              <div key={col.id} className="group relative flex flex-col">
                <Link
                  href={`/collections/${col.slug}`}
                  className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition-all duration-500 group-hover:shadow-xl"
                >
                  {col.banner_url ? (
                    <img
                      src={col.banner_url}
                      alt={col.name}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center text-neutral-500">
                      <FolderHeart className="h-12 w-12 opacity-30" />
                    </div>
                  )}

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

                  {/* Product Count Pill */}
                  {col.product_count !== undefined && (
                    <div className="absolute top-3.5 left-3.5">
                      <span className="rounded-full bg-white/90 backdrop-blur-xs px-3 py-1 text-[10px] font-semibold tracking-wider text-black uppercase shadow-xs">
                        {col.product_count} {col.product_count === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                  )}

                  {/* Card Bottom Content */}
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white flex flex-col justify-end">
                    <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#EAD098] mb-1">
                      Collection
                    </span>
                    <h2
                      className={`${jost.className} text-2xl font-medium tracking-tight text-white mb-2 transition-transform duration-300 group-hover:translate-x-1`}
                    >
                      {col.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/90 group-hover:text-[#EAD098] transition-colors">
                      <span>View Collection</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center">
            <FolderHeart className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
            <h3 className={`${jost.className} text-xl font-medium text-neutral-800`}>
              No collections published yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Our curated seasonal collections are being prepared. In the meantime, browse our wide product catalog.
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
