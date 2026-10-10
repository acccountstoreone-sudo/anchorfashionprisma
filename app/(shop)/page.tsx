import {
  getCachedCategories,
  getCachedCollections,
  getCachedProducts,
  getCachedFeaturedProducts,
  getCachedHeroSlides,
  getCachedFeaturedPromoBanner,
  getCachedWhyChooseUs,
} from "@/lib/cache/catalog-cache";
import { HomeHero } from "@/components/home/home-hero";
import { CategoryHighlight } from "@/components/home/category-highlight";
import { FeaturesBar } from "@/components/home/features-bar";
import { ExploreCollections } from "@/components/home/explore-collections";
import { FeaturedProducts } from "@/components/home/featured-products";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { BrandedCollection } from "@/components/home/branded-collection";
import { PromoBanner } from "@/components/home/promo-banner";
import { TrendingProducts } from "@/components/home/trending-products";
import { LatestBlogs } from "@/components/home/latest-blogs";
import { FadeIn } from "@/components/ui/fade-in";
import { FlashSaleService } from "@/lib/services/marketing/flash-sale.service";
import Link from "next/link";
import { Clock } from "lucide-react";

/**
 * High-Traffic Production Caching (10,000+ Daily Visitors)
 * Revalidates every 60 seconds (ISR) and uses tag-based invalidation.
 */
export const revalidate = 60;

export const metadata = {
  title: "Home | Anchor Fashion Enterprise",
  description:
    "Discover premium apparel for the modern professional at Anchor Fashion.",
};

export default async function HomePage() {
  // Fetch cached catalog data in parallel (Served from memory across visitors)
  const [
    categories,
    collections,
    mensProducts,
    womensProducts,
    kidsProducts,
    accessoriesProducts,
    featuredProducts,
    trendingProducts,
    heroSlides,
    activeFlashSales,
    featuredPromoBanner,
    whyChooseUsData,
  ] = await Promise.all([
    getCachedCategories(),
    getCachedCollections(),
    getCachedProducts({ category: "mens", limit: 8 }),
    getCachedProducts({ category: "womens", limit: 8 }),
    getCachedProducts({ category: "kids", limit: 4 }),
    getCachedProducts({ category: "accessories", limit: 4 }),
    getCachedFeaturedProducts(4),
    getCachedProducts({ sortBy: "rating", limit: 8 }),
    getCachedHeroSlides(),
    FlashSaleService.getActiveFlashSales(),
    getCachedFeaturedPromoBanner(),
    getCachedWhyChooseUs(),
  ]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#FAFAFA]">
      {/* 1. Immersive Hero Banner */}
      <HomeHero slides={heroSlides} />

      {/* 2. Features Bar (Service Guarantees) */}
      <FadeIn delay={0.1} direction="none">
        <FeaturesBar />
      </FadeIn>

      {/* 2.5 Flash Deals Banner (Dynamic) */}
      {activeFlashSales && activeFlashSales.length > 0 && (
        <FadeIn delay={0.15} direction="up">
          <div className="bg-red-600 text-white py-3 sm:py-4 px-3 sm:px-4 text-center shadow-lg relative z-20">
            <Link href="/flash-deals" className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold uppercase tracking-wider hover:scale-105 transition-transform">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse shrink-0" />
              <span>Flash Sale Live! Shop limited time deals before they're gone</span>
              <span className="bg-black/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded text-[10px] sm:text-xs shrink-0">Shop Now</span>
            </Link>
          </div>
        </FadeIn>
      )}

      {/* 3. Editorial Category Highlight Masonry */}
      <FadeIn delay={0.2} direction="up">
        <CategoryHighlight categories={categories} />
      </FadeIn>

      <div className="space-y-10 py-6 md:space-y-16 md:py-12 lg:space-y-20 lg:py-16">
        {/* 5. The Collection Grid */}
        <FadeIn>
          <ExploreCollections collections={collections} categories={categories} />
        </FadeIn>

        {/* Mens Collection - MOVED DOWN */}

        {/* 6. Womens Collection - MOVED DOWN */}

        {/* Kids and Accessories - MOVED DOWN */}

        {/* 7. Mid-Season Promo Banner */}
        <FadeIn direction="left">
          <PromoBanner
            title={featuredPromoBanner.title}
            subtitle={featuredPromoBanner.subtitle}
            description={featuredPromoBanner.description}
            ctaText={featuredPromoBanner.ctaText}
            ctaLink={featuredPromoBanner.ctaLink}
            imageUrl={featuredPromoBanner.imageUrl}
          />
        </FadeIn>

        {/* 8. Trending Products */}
        <FadeIn>
          <TrendingProducts products={trendingProducts.data || []} />
        </FadeIn>

        {/* 9. Brand Ethos / Story */}
        <FadeIn direction="right">
          <WhyChooseUs data={whyChooseUsData} />
        </FadeIn>

        {/* 10. Featured Products (New Arrivals) */}
        <FadeIn>
          <FeaturedProducts products={featuredProducts} />
        </FadeIn>

        {/* 11. Category Collections (Mens, Womens, Kids, Accessories) */}
        <div className="space-y-10 md:space-y-14">
          <FadeIn>
            <BrandedCollection 
              products={mensProducts.data} 
              title="Men's Collection"
              subtitle="Men's"
              viewAllLink="/categories/mens"
            />
          </FadeIn>
          <FadeIn>
            <BrandedCollection 
              products={womensProducts.data}
              title="Women's Collection"
              subtitle="Women's"
              viewAllLink="/categories/womens"
            />
          </FadeIn>
          <FadeIn>
            <BrandedCollection 
              products={kidsProducts.data} 
              title="Kids Collection"
              subtitle="Kids"
              viewAllLink="/categories/kids"
            />
          </FadeIn>
          <FadeIn>
            <BrandedCollection 
              products={accessoriesProducts.data} 
              title="Accessories"
              subtitle="Accessories"
              viewAllLink="/categories/accessories"
            />
          </FadeIn>
        </div>

        {/* 12. Latest from Blog / Editorial Journal */}
        <FadeIn>
          <LatestBlogs />
        </FadeIn>
      </div>
    </div>
  );
}
