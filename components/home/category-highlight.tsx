import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { jost } from "@/lib/fonts";
import { Category } from "@/types/catalog.types";
import { CuratedCategoriesData } from "@/types/curated-categories.types";

interface CategoryHighlightProps {
  categories?: Category[];
  curatedData?: CuratedCategoriesData;
}

interface NormalizedCategoryItem {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  imageUrl: string | null;
}

function CategoryCardMedia({
  imageUrl,
  name,
  sizes,
}: {
  imageUrl?: string | null;
  name: string;
  sizes: string;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="h-16 w-16 rounded-full bg-white/5 border border-[#C9A86A]/20 flex items-center justify-center mb-3">
        <span className="text-xl font-light text-[#C9A86A] uppercase tracking-widest">
          {name ? name.slice(0, 2) : "AF"}
        </span>
      </div>
    </div>
  );
}

export function CategoryHighlight({
  categories = [],
  curatedData,
}: CategoryHighlightProps) {
  // If curatedData explicitly declares the section disabled by admin, hide gracefully
  if (curatedData?.settings && curatedData.settings.isEnabled === false) {
    return null;
  }

  const settings = curatedData?.settings;
  const badgeText = settings?.badge || "The Style Edit";
  const titleText = settings?.title || "Curated Categories";
  const descriptionText =
    settings?.description ||
    "Explore our most sought-after silhouettes and luxury tailoring, designed for modern elegance.";
  const viewAllText = settings?.viewAllText || "Shop All Categories";
  const viewAllLink = settings?.viewAllLink || "/categories";

  // Build the unified list of display items
  let displayItems: NormalizedCategoryItem[] = [];

  if (curatedData?.items && curatedData.items.length > 0) {
    displayItems = curatedData.items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      subtitle: item.subtitle || "Shop Now",
      imageUrl: item.imageUrl,
    }));
  } else {
    // Graceful fallback to active categories if no custom slots configured
    const activeCategories = (categories || []).filter(
      (c) => c && c.id && c.is_active !== false
    );

    const defaultSubtitles = [
      "Classic & Contemporary",
      "Signature Collection",
      "Shop Now",
      "Shop Now",
    ];

    displayItems = activeCategories.map((c, idx) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      subtitle: defaultSubtitles[idx] || "Curated Category",
      imageUrl: c.icon_url || (c as any).imageUrl || null,
    }));
  }

  // If no items available to display, hide section
  if (displayItems.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-gray-100 bg-white py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
              {badgeText}
            </span>
            <h2
              className={`${jost.className} mb-3 text-3xl font-light tracking-tight text-[#1A1A1A] md:text-5xl`}
            >
              {titleText}
            </h2>
            <p className="text-sm font-light tracking-wide text-gray-500">
              {descriptionText}
            </p>
          </div>
          <Link
            href={viewAllLink}
            className="border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.2em] text-black transition-colors hover:border-[#C9A86A] hover:text-[#C9A86A]"
          >
            {viewAllText}
          </Link>
        </div>

        {/* 1 Category: Single Featured Hero Card */}
        {displayItems.length === 1 && (
          <div className="w-full">
            <Link
              href={`/categories/${displayItems[0].slug}`}
              className="group relative block aspect-[16/9] md:h-[450px] w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-all duration-500 hover:shadow-2xl"
            >
              <CategoryCardMedia
                imageUrl={displayItems[0].imageUrl}
                name={displayItems[0].name}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between text-white">
                <div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#C9A86A]">
                    {displayItems[0].subtitle || "Featured Category"}
                  </span>
                  <h3 className={`${jost.className} text-3xl font-medium md:text-5xl`}>
                    {displayItems[0].name}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-transform group-hover:scale-110 group-hover:bg-white group-hover:text-black">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* 2 Categories: 2-Column Split */}
        {displayItems.length === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayItems.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group relative block aspect-[4/5] md:h-[450px] w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-all duration-500 hover:shadow-2xl"
              >
                <CategoryCardMedia
                  imageUrl={cat.imageUrl}
                  name={cat.name}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between text-white">
                  <div>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#C9A86A]">
                      {cat.subtitle || "Curated Category"}
                    </span>
                    <h3 className={`${jost.className} text-3xl font-medium md:text-4xl`}>
                      {cat.name}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-transform group-hover:scale-110 group-hover:bg-white group-hover:text-black">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 3 Categories: 3-Column Grid */}
        {displayItems.length === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {displayItems.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group relative block aspect-[3/4] md:h-[450px] w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-all duration-500 hover:shadow-2xl"
              >
                <CategoryCardMedia
                  imageUrl={cat.imageUrl}
                  name={cat.name}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A86A]">
                      {cat.subtitle || "Collection"}
                    </span>
                    <h3 className={`${jost.className} text-2xl font-medium`}>
                      {cat.name}
                    </h3>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-transform group-hover:scale-110 group-hover:bg-white group-hover:text-black">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 4+ Categories: Signature Editorial Staggered Masonry */}
        {displayItems.length >= 4 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            {/* Left Column (Large Slot 1 + Small Slot 3 & 4) */}
            <div className="flex flex-col gap-4 md:col-span-7 md:gap-6">
              {/* Slot 1: Primary Large Card */}
              <Link
                href={`/categories/${displayItems[0].slug}`}
                className="group relative block aspect-[4/5] w-full overflow-hidden bg-gray-50 md:aspect-auto md:h-[500px]"
              >
                <CategoryCardMedia
                  imageUrl={displayItems[0].imageUrl}
                  name={displayItems[0].name}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                  <div className="text-white">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                      {displayItems[0].subtitle || "Classic & Contemporary"}
                    </span>
                    <h3 className={`${jost.className} text-3xl font-medium`}>
                      {displayItems[0].name}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:bg-white group-hover:text-black">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>

              {/* Slot 3 & 4: Two Square Grid Cards */}
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <Link
                  href={`/categories/${displayItems[2].slug}`}
                  className="group relative block aspect-square w-full overflow-hidden bg-gray-50 md:aspect-auto md:h-[300px]"
                >
                  <CategoryCardMedia
                    imageUrl={displayItems[2].imageUrl}
                    name={displayItems[2].name}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className={`${jost.className} mb-1 text-xl font-medium`}>
                      {displayItems[2].name}
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider transition-colors group-hover:text-[#C9A86A]">
                      {displayItems[2].subtitle || "Shop Now"}{" "}
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
                <Link
                  href={`/categories/${displayItems[3].slug}`}
                  className="group relative block aspect-square w-full overflow-hidden bg-gray-50 md:aspect-auto md:h-[300px]"
                >
                  <CategoryCardMedia
                    imageUrl={displayItems[3].imageUrl}
                    name={displayItems[3].name}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className={`${jost.className} mb-1 text-xl font-medium`}>
                      {displayItems[3].name}
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider transition-colors group-hover:text-[#C9A86A]">
                      {displayItems[3].subtitle || "Shop Now"}{" "}
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right Column (Slot 2: Signature Tall Card) */}
            <div className="aspect-[4/5] md:col-span-5 md:h-auto md:aspect-auto">
              <Link
                href={`/categories/${displayItems[1].slug}`}
                className="group relative block h-full w-full overflow-hidden bg-gray-50"
              >
                <CategoryCardMedia
                  imageUrl={displayItems[1].imageUrl}
                  name={displayItems[1].name}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                  <div className="text-white">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                      {displayItems[1].subtitle || "Signature Collection"}
                    </span>
                    <h3 className={`${jost.className} text-3xl font-medium`}>
                      {displayItems[1].name}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:bg-white group-hover:text-black">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
