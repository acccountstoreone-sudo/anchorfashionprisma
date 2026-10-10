import { unstable_cache } from "next/cache";
import {
  CatalogRepository,
  ProductListParams,
} from "@/repositories/catalog.repository";
import { BrandRepository } from "@/lib/repositories/catalog/brand.repository";
import { CollectionRepository } from "@/lib/repositories/catalog/collection.repository";
import {
  getHeroSlides,
  getFeaturedPromoBanner,
  type HeroSlide,
  type FeaturedPromoBannerData,
} from "@/actions/cms.actions";

/**
 * Enterprise Cache Tag Constants
 * Used for targeted Next.js cache invalidation across the catalog lifecycle.
 */
export const CACHE_TAGS = {
  CATALOG: "catalog",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  BRANDS: "brands",
  COLLECTIONS: "collections",
  HOMEPAGE: "homepage",
} as const;


/**
 * Standard Cache TTLs (Time-To-Live in seconds)
 */
export const CACHE_TTL = {
  FAST: 30, // 30s for high-velocity feeds
  STANDARD: 60, // 60s for standard catalog listings & homepage
  LONG: 300, // 5 mins for rarely changing taxonomies (categories, brands)
} as const;

/**
 * Cached Categories Fetcher
 * Caches all active categories for 5 minutes; tagged for instant invalidation on category edits.
 */
export const getCachedCategories = unstable_cache(
  async () => CatalogRepository.getCategories(),
  ["catalog-categories-list"],
  {
    tags: [CACHE_TAGS.CATEGORIES, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.LONG,
  }
);

/**
 * Cached Brands Fetcher
 * Caches all active brands for 5 minutes; tagged for instant invalidation on brand edits.
 */
export const getCachedBrands = unstable_cache(
  async (activeOnly: boolean = true) => BrandRepository.getBrands(activeOnly),
  ["catalog-brands-list"],
  {
    tags: [CACHE_TAGS.BRANDS, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.LONG,
  }
);

/**
 * Cached Collections Fetcher
 * Caches all active collections; tagged for instant invalidation on collection edits.
 */
export const getCachedCollections = unstable_cache(
  async (activeOnly: boolean = true) =>
    CollectionRepository.getCollections(activeOnly),
  ["catalog-collections-list"],
  {
    tags: [CACHE_TAGS.COLLECTIONS, CACHE_TAGS.HOMEPAGE, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.STANDARD,
  }
);

/**
 * Cached Single Collection Fetcher by Slug
 */
export function getCachedCollectionBySlug(slug: string) {
  const fetcher = unstable_cache(
    async () => CollectionRepository.getCollectionBySlug(slug),
    ["catalog-collection", slug],
    {
      tags: [
        CACHE_TAGS.COLLECTIONS,
        CACHE_TAGS.CATALOG,
        `collection-${slug}`,
      ],
      revalidate: CACHE_TTL.STANDARD,
    }
  );

  return fetcher();
}

/**
 * Cached Featured Products Fetcher
 * Caches featured items displayed on homepage.
 */
export const getCachedFeaturedProducts = unstable_cache(
  async (limit: number = 4) => CatalogRepository.getFeaturedProducts(limit),
  ["catalog-featured-products"],
  {
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.HOMEPAGE, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.STANDARD,
  }
);

/**
 * Cached New Arrivals Fetcher
 */
export const getCachedNewArrivals = unstable_cache(
  async (limit: number = 4) => CatalogRepository.getNewArrivals(limit),
  ["catalog-new-arrivals"],
  {
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.HOMEPAGE, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.STANDARD,
  }
);

/**
 * Cached Products List Fetcher
 * Caches filtered catalog queries with key based on serialized parameters.
 */
export function getCachedProducts(params: ProductListParams) {
  const cacheKey = [
    "catalog-products",
    params.category || "all",
    params.brand || "all",
    params.sortBy || "newest",
    String(params.limit || 12),
    String(params.offset || 0),
    String(params.minPrice || ""),
    String(params.maxPrice || ""),
    params.search || "",
  ];

  const fetcher = unstable_cache(
    async () => CatalogRepository.getProducts(params),
    cacheKey,
    {
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.CATALOG],
      revalidate: CACHE_TTL.STANDARD,
    }
  );

  return fetcher();
}

/**
 * Cached Single Product Fetcher by Slug
 */
export function getCachedProductBySlug(slug: string) {
  const fetcher = unstable_cache(
    async () => CatalogRepository.getProductBySlug(slug),
    ["catalog-product", slug],
    {
      tags: [
        CACHE_TAGS.PRODUCTS,
        CACHE_TAGS.CATALOG,
        `product-${slug}`,
      ],
      revalidate: CACHE_TTL.STANDARD,
    }
  );

  return fetcher();
}

/**
 * Cached Hero Slides Fetcher
 */
export const getCachedHeroSlides = unstable_cache(
  async (): Promise<HeroSlide[]> => getHeroSlides(),
  ["homepage-hero-slides"],
  {
    tags: [CACHE_TAGS.HOMEPAGE, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.STANDARD,
  }
);

/**
 * Cached Featured Promo Banner Fetcher
 */
export const getCachedFeaturedPromoBanner = unstable_cache(
  async (): Promise<FeaturedPromoBannerData> => getFeaturedPromoBanner(),
  ["homepage-featured-promo-banner"],
  {
    tags: [CACHE_TAGS.HOMEPAGE, CACHE_TAGS.CATALOG],
    revalidate: CACHE_TTL.STANDARD,
  }
);

/**
 * Cached Why Choose Us / Brand Ethos Settings Fetcher
 */
export const getCachedWhyChooseUs = unstable_cache(
  async () => {
    const { getWhyChooseUsSettings } = await import("@/actions/why-choose-us.actions");
    return getWhyChooseUsSettings();
  },
  ["homepage-why-choose-us"],
  {
    tags: [CACHE_TAGS.HOMEPAGE, CACHE_TAGS.CATALOG, "homepage-why-choose-us"],
    revalidate: CACHE_TTL.STANDARD,
  }
);

