import { revalidateTag, revalidatePath } from "next/cache";
import { CACHE_TAGS } from "./catalog-cache";

/**
 * Enterprise Cache Invalidation Utilities
 * Ensures zero stale data across customer-facing catalog when admin mutations occur.
 * Follows Next.js 16 supported signatures with targeted tag scopes.
 */

export function invalidateProductCache(slug?: string) {
  try {
    revalidateTag(CACHE_TAGS.PRODUCTS, "max");
    revalidateTag(CACHE_TAGS.HOMEPAGE, "max");
    revalidateTag(CACHE_TAGS.CATALOG, "max");
    if (slug) {
      revalidateTag(`product-${slug}`, "max");
    }
    // Also revalidate key path segments
    revalidatePath("/products");
    revalidatePath("/(shop)", "layout");
  } catch (error) {
    console.warn("Failed to invalidate product cache tags:", error);
  }
}

export function invalidateCategoryCache() {
  try {
    revalidateTag(CACHE_TAGS.CATEGORIES, "max");
    revalidateTag(CACHE_TAGS.CATALOG, "max");
    revalidateTag(CACHE_TAGS.HOMEPAGE, "max");
    revalidatePath("/", "page");
    revalidatePath("/", "layout");
    revalidatePath("/(shop)", "layout");
    revalidatePath("/(shop)", "page");
    revalidatePath("/categories");
  } catch (error) {
    console.warn("Failed to invalidate category cache tags:", error);
  }
}

export function invalidateBrandCache() {
  try {
    revalidateTag(CACHE_TAGS.BRANDS, "max");
    revalidateTag(CACHE_TAGS.CATALOG, "max");
    revalidatePath("/(shop)", "layout");
  } catch (error) {
    console.warn("Failed to invalidate brand cache tags:", error);
  }
}

export function invalidateCollectionCache(slug?: string) {
  try {
    revalidateTag(CACHE_TAGS.COLLECTIONS, "max");
    revalidateTag(CACHE_TAGS.HOMEPAGE, "max");
    revalidateTag(CACHE_TAGS.CATALOG, "max");
    if (slug) {
      revalidateTag(`collection-${slug}`, "max");
    }
    revalidatePath("/", "page");
    revalidatePath("/collections");
    revalidatePath("/(shop)", "layout");
    revalidatePath("/admin/products/collections");
  } catch (error) {
    console.warn("Failed to invalidate collection cache tags:", error);
  }
}

export function invalidateHomepageCache() {
  try {
    revalidateTag(CACHE_TAGS.HOMEPAGE, "max");
    revalidateTag(CACHE_TAGS.CATALOG, "max");
    revalidatePath("/", "page");
  } catch (error) {
    console.warn("Failed to invalidate homepage cache tags:", error);
  }
}

export function invalidateAllCatalogCache() {
  try {
    revalidateTag(CACHE_TAGS.CATALOG, "max");
    revalidateTag(CACHE_TAGS.PRODUCTS, "max");
    revalidateTag(CACHE_TAGS.CATEGORIES, "max");
    revalidateTag(CACHE_TAGS.BRANDS, "max");
    revalidateTag(CACHE_TAGS.HOMEPAGE, "max");
    revalidatePath("/(shop)", "layout");
  } catch (error) {
    console.warn("Failed to invalidate all catalog cache tags:", error);
  }
}
