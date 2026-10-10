import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CatalogRepository } from "@/repositories/catalog.repository";
import { ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Categories | Anchor Fashion",
  description: "Explore all luxury fashion apparel, clothing and accessory categories at Anchor Fashion.",
};

export const revalidate = 60;

export default async function CategoriesPage() {
  const dbCategories: any[] = (await CatalogRepository.getCategories()) || [];

  // Include all active valid categories
  const validCategories = dbCategories.filter(
    (c: any) => c && c.id && c.is_active !== false
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header Banner */}
      <section className="relative border-b border-gray-200 bg-[#0D1B2A] text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,168,106,0.18),transparent_60%)] pointer-events-none" />
        <div className="container relative mx-auto px-4 text-center max-w-3xl md:px-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A86A]/30 bg-[#C9A86A]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#EAD098] mb-4">
            <Sparkles className="h-3 w-3" />
            <span>Curated Taxonomies</span>
          </div>
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl md:text-6xl text-white">
            Shop By Category
          </h1>
          <p className="mt-4 text-sm md:text-base text-gray-300 font-light leading-relaxed max-w-xl mx-auto">
            Explore our signature silhouettes, seasonal wardrobe edits, and timeless modern essentials.
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 pt-12 md:px-6">
        {validCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center my-8">
            <p className="text-sm font-medium text-gray-500">No categories found at the moment.</p>
            <p className="mt-1 text-xs text-gray-400">Categories added from the admin panel will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8">
            {validCategories.map((category) => {
              return (
                <Link
                  href={`/categories/${category.slug}`}
                  key={category.id}
                  className="group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl bg-neutral-900 shadow-sm transition-all duration-500 hover:shadow-xl"
                >
                  {category.icon_url ? (
                    <Image
                      src={category.icon_url}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-90"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center p-4">
                      <div className="h-16 w-16 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-3">
                        <span className="text-xl font-light text-[#C9A86A] uppercase tracking-widest">
                          {category.name ? category.name.slice(0, 2) : "AF"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/95" />

                  {/* Top Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="rounded-full bg-white/90 backdrop-blur-xs px-3 py-1 text-[10px] font-bold tracking-wider text-black uppercase shadow-xs">
                      Anchor Edit
                    </span>
                  </div>

                  {/* Bottom Content */}
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white flex flex-col justify-end">
                    <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#EAD098] mb-1">
                      Department
                    </span>
                    <h2 className="text-2xl font-medium tracking-tight text-white mb-2 transition-transform duration-300 group-hover:translate-x-1">
                      {category.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/90 group-hover:text-[#EAD098] transition-colors">
                      <span>Explore Collection</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
