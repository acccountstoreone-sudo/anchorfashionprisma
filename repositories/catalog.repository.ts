import { prisma } from "@/lib/prisma";
import { PromotionRepository } from "@/lib/repositories/marketing/promotion.repository";

export interface ProductListParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: "price_asc" | "price_desc" | "newest" | "rating";
  limit?: number;
  offset?: number;
}

function mapProductToStorefront(p: any, activePromoDiscount?: number | null) {
  if (!p) return null;

  const variants = p.variants || [];
  const totalAvailable = variants.reduce(
    (sum: number, variant: any) => {
      const variantStock = (variant.inventoryLevels || []).reduce(
        (vSum: number, level: any) => vSum + (level.quantityAvailable || 0),
        0
      );
      return sum + variantStock;
    },
    0
  );

  const mediaList = (p.media || []).map((m: any) => ({
    id: m.id,
    url: m.url,
    url_webp: m.urlWebp,
    alt_text: m.altText,
    is_primary: m.isPrimary,
    display_order: m.displayOrder,
    media_type: m.mediaType,
  }));

  const primaryMedia = mediaList.find((m: any) => m.is_primary) || mediaList[0] || null;

  const basePriceNum = Number(p.basePrice);
  let salePriceNum = p.salePrice ? Number(p.salePrice) : null;

  // If there is an active promotion and no lower custom sale price, apply the promotional discount percentage!
  if (activePromoDiscount && activePromoDiscount > 0) {
    const promoDiscountedPrice = Math.round(basePriceNum * (1 - activePromoDiscount / 100));
    if (salePriceNum === null || promoDiscountedPrice < salePriceNum) {
      salePriceNum = promoDiscountedPrice;
    }
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    short_description: p.shortDescription,
    shortDescription: p.shortDescription,
    base_price: basePriceNum,
    basePrice: basePriceNum,
    sale_price: salePriceNum,
    salePrice: salePriceNum,
    cost_price: p.costPrice ? Number(p.costPrice) : null,
    sku: p.sku,
    barcode: p.barcode,
    status: p.status,
    gender: p.gender,
    season: p.season,
    care_instructions: p.careInstructions,
    country_of_origin: p.countryOfOrigin,
    is_featured: p.isFeatured,
    isFeatured: p.isFeatured,
    average_rating: Number(p.rating || 0),
    rating: Number(p.rating || 0),
    review_count: p.reviewCount || 0,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    category_id: p.categoryId,
    brand_id: p.brandId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    categories: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
    brands: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
    product_media: mediaList,
    media: mediaList,
    primary_image_url: primaryMedia ? primaryMedia.url : p.imageUrl || "/placeholder.png",
    variants: variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      price_override: v.priceOverride ? Number(v.priceOverride) : null,
      sale_price: v.salePrice ? Number(v.salePrice) : null,
      weight: v.weight ? Number(v.weight) : null,
      attributes: v.attributes,
      is_active: v.isActive,
      inventory_levels: (v.inventoryLevels || []).map((il: any) => ({
        id: il.id,
        warehouse_id: il.warehouseId,
        quantity_available: il.quantityAvailable,
        quantity_reserved: il.quantityReserved,
        reorder_point: il.reorderPoint,
      })),
    })),
    is_in_stock: totalAvailable > 0 || (variants.length === 0 && p.status === "ACTIVE"),
    total_available_stock: totalAvailable,
    stockQuantity: totalAvailable,
  };
}

export const CatalogRepository = {
  /**
   * Fetch active categories from Neon PostgreSQL
   */
  async getCategories() {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });
      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? "",
        image_url: c.imageUrl ?? null,
        image: c.imageUrl ?? "",
        parent_id: c.parentId ?? null,
        icon_url: c.imageUrl ?? null,
        display_order: c.displayOrder,
        sortOrder: c.displayOrder,
        is_active: c.isActive,
        isActive: c.isActive,
        created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      console.error("Error fetching categories from Neon:", e);
      return [];
    }
  },

  /**
   * Fetch featured products from Neon PostgreSQL
   */
  /**
   * Fetch featured products from Neon PostgreSQL
   */
  async getFeaturedProducts(limit = 4) {
    try {
      const [products, bestPromo] = await Promise.all([
        prisma.product.findMany({
          where: {
            status: "ACTIVE",
            isFeatured: true,
            deletedAt: null,
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            media: { orderBy: { displayOrder: "asc" } },
            variants: { include: { inventoryLevels: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        PromotionRepository.getBestActivePromotion().catch(() => null),
      ]);

      const promoDiscount = bestPromo?.discount_percentage ?? null;
      return products
        .map((p) => mapProductToStorefront(p, promoDiscount))
        .filter((p): p is NonNullable<typeof p> => p !== null) as any;
    } catch (e) {
      console.error("Error fetching featured products from Neon:", e);
      return [];
    }
  },

  /**
   * Fetch new arrival products from Neon PostgreSQL
   */
  async getNewArrivals(limit = 4) {
    try {
      const [products, bestPromo] = await Promise.all([
        prisma.product.findMany({
          where: {
            status: "ACTIVE",
            deletedAt: null,
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            media: { orderBy: { displayOrder: "asc" } },
            variants: { include: { inventoryLevels: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        PromotionRepository.getBestActivePromotion().catch(() => null),
      ]);

      const promoDiscount = bestPromo?.discount_percentage ?? null;
      return products
        .map((p) => mapProductToStorefront(p, promoDiscount))
        .filter((p): p is NonNullable<typeof p> => p !== null) as any;
    } catch (e) {
      console.error("Error fetching new arrivals from Neon:", e);
      return [];
    }
  },

  /**
   * Fetch filtered & paginated products from Neon PostgreSQL
   */
  async getProducts(params: ProductListParams) {
    try {
      const where: any = {
        status: "ACTIVE",
        deletedAt: null,
      };

      if (params.category) {
        where.category = { slug: params.category };
      }
      if (params.brand) {
        where.brand = { slug: params.brand };
      }
      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        where.basePrice = {};
        if (params.minPrice !== undefined) where.basePrice.gte = params.minPrice;
        if (params.maxPrice !== undefined) where.basePrice.lte = params.maxPrice;
      }
      if (params.search && params.search.trim()) {
        const term = params.search.trim();
        where.OR = [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { shortDescription: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
        ];
      }

      let orderBy: any = { createdAt: "desc" };
      if (params.sortBy === "price_asc") {
        orderBy = { basePrice: "asc" };
      } else if (params.sortBy === "price_desc") {
        orderBy = { basePrice: "desc" };
      } else if (params.sortBy === "rating") {
        orderBy = { rating: "desc" };
      } else {
        orderBy = { createdAt: "desc" };
      }

      const limit = params.limit || 12;
      const offset = params.offset || 0;

      const [products, total, bestPromo] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            media: { orderBy: { displayOrder: "asc" } },
            variants: { include: { inventoryLevels: true } },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.product.count({ where }),
        PromotionRepository.getBestActivePromotion().catch(() => null),
      ]);

      const promoDiscount = bestPromo?.discount_percentage ?? null;

      return {
        data: products.map((p) => mapProductToStorefront(p, promoDiscount)),
        count: total,
      };
    } catch (error) {
      console.error("Error fetching products from Neon:", error);
      return { data: [], count: 0 };
    }
  },

  /**
   * Fetch single product by slug from Neon PostgreSQL
   */
  async getProductBySlug(slug: string): Promise<any> {
    try {
      const [product, bestPromo] = await Promise.all([
        prisma.product.findFirst({
          where: {
            slug,
            deletedAt: null,
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            media: { orderBy: { displayOrder: "asc" } },
            variants: {
              include: {
                inventoryLevels: true,
              },
            },
            seo: true,
            reviews: {
              where: { isApproved: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        }),
        PromotionRepository.getBestActivePromotion().catch(() => null),
      ]);

      if (!product) return null;
      const promoDiscount = bestPromo?.discount_percentage ?? null;
      return mapProductToStorefront(product, promoDiscount);
    } catch (error) {
      console.error("Error fetching product by slug from Neon:", error);
      return null;
    }
  },
};
