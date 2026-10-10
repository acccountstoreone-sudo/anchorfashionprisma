import { ProductListParams } from "@/repositories/catalog.repository";
import {
  getCachedCategories,
  getCachedBrands,
  getCachedFeaturedProducts,
  getCachedNewArrivals,
  getCachedProducts,
  getCachedProductBySlug,
} from "@/lib/cache/catalog-cache";

export class CatalogService {
  /**
   * Get all active categories (Cached with 300s TTL)
   */
  static async getCategories() {
    return getCachedCategories();
  }

  /**
   * Get all active brands (Cached with 300s TTL)
   */
  static async getBrands() {
    return getCachedBrands(true);
  }

  /**
   * Get featured products (Cached with 60s TTL)
   */
  static async getFeaturedProducts(limit = 4) {
    return getCachedFeaturedProducts(limit);
  }

  /**
   * Get newest products (Cached with 60s TTL)
   */
  static async getNewArrivals(limit = 4) {
    return getCachedNewArrivals(limit);
  }

  /**
   * Get products with filtering and pagination (Cached with 60s TTL by params)
   */
  static async getProducts(params: ProductListParams) {
    return getCachedProducts(params);
  }

  /**
   * Get a single product by slug (Cached with 60s TTL)
   */
  static async getProductBySlug(slug: string) {
    return getCachedProductBySlug(slug);
  }
}

