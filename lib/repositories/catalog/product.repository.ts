import { prisma } from "@/lib/prisma";
import { CreateProductInput, Product } from "@/types/catalog.types";
import { cache } from "react";

function mapToAdminProduct(p: any): Product {
  const variants = p.variants || [];
  let totalStock = 0;

  const mappedVariants = variants.map((v: any) => {
    const vStock = (v.inventoryLevels || []).reduce(
      (sum: number, lvl: any) => sum + (lvl.quantityAvailable || 0),
      0
    );
    totalStock += vStock;

    return {
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      barcode: v.barcode,
      priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
      salePrice: v.salePrice ? Number(v.salePrice) : null,
      costPrice: v.costPrice ? Number(v.costPrice) : null,
      weight: v.weight ? Number(v.weight) : null,
      attributes: v.attributes,
      isActive: v.isActive,
      stockQuantity: vStock,
      inventory_levels: (v.inventoryLevels || []).map((il: any) => ({
        id: il.id,
        variant_id: il.variantId,
        warehouse_id: il.warehouseId,
        quantity_available: il.quantityAvailable,
        quantity_reserved: il.quantityReserved,
        reorder_point: il.reorderPoint,
      })),
    };
  });

  const mediaList = (p.media || []).map((m: any) => ({
    id: m.id,
    productId: m.productId,
    variantId: m.variantId,
    url: m.url,
    urlWebp: m.urlWebp,
    altText: m.altText,
    displayOrder: m.displayOrder,
    isPrimary: m.isPrimary,
    mediaType: m.mediaType,
  }));

  const primaryImage = mediaList.find((m: any) => m.isPrimary)?.url || mediaList[0]?.url || p.imageUrl || null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? null,
    short_description: p.shortDescription ?? null,
    description: p.description ?? null,
    categoryId: p.categoryId,
    category_id: p.categoryId,
    brandId: p.brandId ?? null,
    brand_id: p.brandId ?? null,
    basePrice: Number(p.basePrice),
    base_price: Number(p.basePrice),
    costPrice: p.costPrice ? Number(p.costPrice) : null,
    cost_price: p.costPrice ? Number(p.costPrice) : null,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    sale_price: p.salePrice ? Number(p.salePrice) : null,
    sku: p.sku ?? null,
    barcode: p.barcode ?? null,
    status: p.status,
    gender: p.gender ?? null,
    season: p.season ?? null,
    careInstructions: p.careInstructions ?? null,
    countryOfOrigin: p.countryOfOrigin ?? null,
    isFeatured: p.isFeatured,
    is_featured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    rating: Number(p.rating || 0),
    reviewCount: p.reviewCount || 0,
    imageUrl: primaryImage,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
    variants: mappedVariants,
    media: mediaList,
    seo: p.seo
      ? {
          id: p.seo.id,
          productId: p.seo.productId,
          metaTitle: p.seo.metaTitle,
          metaDescription: p.seo.metaDescription,
          canonicalUrl: p.seo.canonicalUrl,
          ogTitle: p.seo.ogTitle,
          ogDescription: p.seo.ogDescription,
          ogImageUrl: p.seo.ogImageUrl,
          twitterCardType: p.seo.twitterCardType,
          structuredData: p.seo.structuredData,
          keywords: p.seo.keywords,
        }
      : null,
    tags: (p.productTags || []).map((pt: any) => pt.tag).filter(Boolean),
    stockQuantity: totalStock,
  } as unknown as Product;
}

export class ProductRepository {
  /**
   * Helper to ensure an active warehouse exists and return its ID
   */
  static async getDefaultWarehouseId(): Promise<string> {
    const existing = await prisma.warehouse.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (existing?.id) return existing.id;

    const anyWh = await prisma.warehouse.findFirst({
      select: { id: true },
    });
    if (anyWh?.id) return anyWh.id;

    const created = await prisma.warehouse.create({
      data: {
        name: "Main Central Warehouse",
        code: "WH-MAIN-01",
        address: "Dhaka, Bangladesh",
        city: "Dhaka",
        country: "BD",
        isActive: true,
      },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Retrieves a paginated list of products with optional filtering.
   */
  static getProducts = cache(
    async ({
      page = 1,
      limit = 20,
      search,
      categoryId,
      brandId,
      status,
    }: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      brandId?: string;
      status?: string;
    }) => {
      const offset = (page - 1) * limit;
      const where: any = {
        deletedAt: null,
      };

      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { barcode: { contains: term, mode: "insensitive" } },
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (brandId) {
        where.brandId = brandId;
      }
      if (status && status !== "ALL") {
        where.status = status;
      }

      const [records, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            variants: {
              include: {
                inventoryLevels: true,
              },
            },
            media: { orderBy: { displayOrder: "asc" } },
            seo: true,
            productTags: { include: { tag: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        products: records.map(mapToAdminProduct),
        total,
        page,
        limit,
      };
    }
  );

  /**
   * Retrieves a single product by ID with all relationships.
   */
  static getProductById = cache(async (id: string): Promise<Product | null> => {
    try {
      const record = await prisma.product.findFirst({
        where: { id, deletedAt: null },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            include: {
              inventoryLevels: true,
            },
          },
          media: { orderBy: { displayOrder: "asc" } },
          seo: true,
          productTags: { include: { tag: true } },
        },
      });

      if (!record) return null;
      return mapToAdminProduct(record);
    } catch (err) {
      console.error("Error fetching product by ID via Prisma:", err);
      return null;
    }
  });

  /**
   * Creates a new product along with variants, media, SEO, and inventory.
   */
  static async createProduct(input: CreateProductInput) {
    const { seo, tags, media, variants, ...productData } = input;

    // Check duplicate SKU
    if (productData.sku?.trim()) {
      const existingSku = await prisma.product.findFirst({
        where: { sku: productData.sku.trim(), deletedAt: null },
        select: { id: true },
      });
      if (existingSku) {
        throw new Error(`A product with SKU "${productData.sku}" already exists.`);
      }
    }

    // Check duplicate slug
    if (productData.slug?.trim()) {
      const existingSlug = await prisma.product.findFirst({
        where: { slug: productData.slug.trim(), deletedAt: null },
        select: { id: true },
      });
      if (existingSlug) {
        throw new Error(`A product with URL slug "${productData.slug}" already exists.`);
      }
    }

    const defaultWarehouseId = await ProductRepository.getDefaultWarehouseId();

    // Primary image from media
    const primaryMediaUrl = media?.find((m: any) => m.isPrimary)?.url || media?.[0]?.url || null;

    // Create the product in Neon
    const createdProduct = await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        shortDescription: productData.shortDescription,
        description: productData.description,
        categoryId: productData.categoryId,
        brandId: productData.brandId || null,
        basePrice: productData.basePrice,
        costPrice: productData.costPrice ?? null,
        salePrice: productData.salePrice ?? null,
        sku: productData.sku && productData.sku.trim() ? productData.sku.trim() : null,
        barcode: productData.barcode && productData.barcode.trim() ? productData.barcode.trim() : null,
        status: productData.status || "DRAFT",
        gender: productData.gender || null,
        season: productData.season || null,
        careInstructions: productData.careInstructions || null,
        countryOfOrigin: productData.countryOfOrigin || null,
        isFeatured: productData.isFeatured || false,
        imageUrl: primaryMediaUrl,
        galleryUrls: media?.map((m: any) => m.url) || [],
      },
    });

    const productId = createdProduct.id;

    // Create SEO
    if (seo) {
      await prisma.productSeo.create({
        data: {
          productId,
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          canonicalUrl: seo.canonicalUrl,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImageUrl: seo.ogImageUrl,
          twitterCardType: seo.twitterCardType,
          structuredData: seo.structuredData || {},
          keywords: seo.keywords || [],
        },
      });
    }

    // Link Tags
    if (tags && tags.length > 0) {
      await prisma.productTag.createMany({
        data: tags.map((tagId) => ({
          productId,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Create Media
    if (media && media.length > 0) {
      await prisma.productMedia.createMany({
        data: media.map((m: any, idx: number) => ({
          productId,
          url: m.url,
          urlWebp: m.urlWebp || null,
          altText: m.altText || null,
          displayOrder: m.displayOrder ?? idx,
          isPrimary: m.isPrimary ?? idx === 0,
          mediaType: m.mediaType || "IMAGE",
        })),
      });
    }

    // Create Variants & Inventory
    if (variants && variants.length > 0) {
      for (const [idx, v] of variants.entries()) {
        const sku = v.sku?.trim() || `${createdProduct.slug.toUpperCase()}-V${idx + 1}`;
        const createdVariant = await prisma.variant.create({
          data: {
            productId,
            sku,
            barcode: v.barcode && v.barcode.trim() ? v.barcode.trim() : null,
            priceOverride: v.priceOverride ?? null,
            salePrice: v.salePrice ?? null,
            weight: v.weight ?? null,
            attributes: v.attributes || {},
            isActive: v.isActive ?? true,
          },
        });

        if (defaultWarehouseId) {
          await prisma.inventoryLevel.create({
            data: {
              variantId: createdVariant.id,
              warehouseId: defaultWarehouseId,
              quantityAvailable: Number(v.stockQuantity ?? 0),
              quantityReserved: 0,
              reorderPoint: 10,
            },
          });
        }
      }
    } else {
      // Single default variant
      const defaultSku = productData.sku?.trim() || `${createdProduct.slug.toUpperCase()}-DEF`;
      const createdVariant = await prisma.variant.create({
        data: {
          productId,
          sku: defaultSku,
          barcode: productData.barcode && productData.barcode.trim() ? productData.barcode.trim() : null,
          priceOverride: productData.basePrice,
          salePrice: productData.salePrice ?? null,
          attributes: { Standard: "Default" },
          isActive: true,
        },
      });

      if (defaultWarehouseId) {
        await prisma.inventoryLevel.create({
          data: {
            variantId: createdVariant.id,
            warehouseId: defaultWarehouseId,
            quantityAvailable: Number(productData.stockQuantity ?? 0),
            quantityReserved: 0,
            reorderPoint: 10,
          },
        });
      }
    }

    return this.getProductById(productId);
  }

  /**
   * Updates an existing product.
   */
  static async updateProduct(id: string, input: Partial<CreateProductInput>) {
    const { seo, tags, media, variants, ...productData } = input;

    const primaryMediaUrl = media?.find((m: any) => m.isPrimary)?.url || media?.[0]?.url || undefined;

    // 1. Update core product fields
    await prisma.product.update({
      where: { id },
      data: {
        ...(productData.name !== undefined && { name: productData.name }),
        ...(productData.slug !== undefined && { slug: productData.slug }),
        ...(productData.shortDescription !== undefined && { shortDescription: productData.shortDescription }),
        ...(productData.description !== undefined && { description: productData.description }),
        ...(productData.categoryId !== undefined && { categoryId: productData.categoryId }),
        ...(productData.brandId !== undefined && { brandId: productData.brandId || null }),
        ...(productData.basePrice !== undefined && { basePrice: productData.basePrice }),
        ...(productData.costPrice !== undefined && { costPrice: productData.costPrice }),
        ...(productData.salePrice !== undefined && { salePrice: productData.salePrice }),
        ...(productData.sku !== undefined && { sku: productData.sku && productData.sku.trim() ? productData.sku.trim() : null }),
        ...(productData.barcode !== undefined && { barcode: productData.barcode && productData.barcode.trim() ? productData.barcode.trim() : null }),
        ...(productData.status !== undefined && { status: productData.status }),
        ...(productData.gender !== undefined && { gender: productData.gender }),
        ...(productData.season !== undefined && { season: productData.season }),
        ...(productData.careInstructions !== undefined && { careInstructions: productData.careInstructions }),
        ...(productData.countryOfOrigin !== undefined && { countryOfOrigin: productData.countryOfOrigin }),
        ...(productData.isFeatured !== undefined && { isFeatured: productData.isFeatured }),
        ...(primaryMediaUrl !== undefined && { imageUrl: primaryMediaUrl }),
        ...(media !== undefined && { galleryUrls: media.map((m: any) => m.url) }),
      },
    });

    // 2. Update SEO
    if (seo) {
      await prisma.productSeo.upsert({
        where: { productId: id },
        update: {
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          canonicalUrl: seo.canonicalUrl,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImageUrl: seo.ogImageUrl,
          twitterCardType: seo.twitterCardType,
          structuredData: seo.structuredData || {},
          keywords: seo.keywords || [],
        },
        create: {
          productId: id,
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          canonicalUrl: seo.canonicalUrl,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImageUrl: seo.ogImageUrl,
          twitterCardType: seo.twitterCardType,
          structuredData: seo.structuredData || {},
          keywords: seo.keywords || [],
        },
      });
    }

    // 3. Update Tags
    if (tags !== undefined) {
      await prisma.productTag.deleteMany({ where: { productId: id } });
      if (tags.length > 0) {
        await prisma.productTag.createMany({
          data: tags.map((tagId) => ({
            productId: id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // 4. Update Media
    if (media !== undefined) {
      await prisma.productMedia.deleteMany({ where: { productId: id } });
      if (media.length > 0) {
        await prisma.productMedia.createMany({
          data: media.map((m: any, idx: number) => ({
            productId: id,
            url: m.url,
            urlWebp: m.urlWebp || null,
            altText: m.altText || null,
            displayOrder: m.displayOrder ?? idx,
            isPrimary: m.isPrimary ?? idx === 0,
            mediaType: m.mediaType || "IMAGE",
          })),
        });
      }
    }

    // 5. Update Variants
    if (variants !== undefined || productData.stockQuantity !== undefined) {
      const defaultWarehouseId = await ProductRepository.getDefaultWarehouseId();

      if (variants && variants.length > 0) {
        await prisma.variant.deleteMany({ where: { productId: id } });

        for (const [idx, v] of variants.entries()) {
          const sku = v.sku?.trim() || `${id.slice(0, 8).toUpperCase()}-V${idx + 1}`;
          const createdVariant = await prisma.variant.create({
            data: {
              productId: id,
              sku,
              barcode: v.barcode && v.barcode.trim() ? v.barcode.trim() : null,
              priceOverride: v.priceOverride ?? null,
              salePrice: v.salePrice ?? null,
              weight: v.weight ?? null,
              attributes: v.attributes || {},
              isActive: v.isActive ?? true,
            },
          });

          if (defaultWarehouseId) {
            await prisma.inventoryLevel.create({
              data: {
                variantId: createdVariant.id,
                warehouseId: defaultWarehouseId,
                quantityAvailable: Number(v.stockQuantity ?? 0),
                quantityReserved: 0,
                reorderPoint: 10,
              },
            });
          }
        }
      } else if (productData.stockQuantity !== undefined) {
        const existingVariants = await prisma.variant.findMany({
          where: { productId: id },
          take: 1,
        });

        if (existingVariants.length > 0) {
          const varId = existingVariants[0].id;
          if (defaultWarehouseId) {
            await prisma.inventoryLevel.upsert({
              where: {
                variantId_warehouseId: {
                  variantId: varId,
                  warehouseId: defaultWarehouseId,
                },
              },
              update: {
                quantityAvailable: Number(productData.stockQuantity ?? 0),
              },
              create: {
                variantId: varId,
                warehouseId: defaultWarehouseId,
                quantityAvailable: Number(productData.stockQuantity ?? 0),
                quantityReserved: 0,
                reorderPoint: 10,
              },
            });
          }
        }
      }
    }

    return this.getProductById(id);
  }

  /**
   * Soft deletes a product in Neon.
   */
  static async deleteProduct(id: string) {
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });
    return true;
  }

  /**
   * Bulk update status of multiple products in Neon.
   */
  static async bulkUpdateStatus(
    ids: string[],
    status: "DRAFT" | "ACTIVE" | "ARCHIVED"
  ): Promise<number> {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return result.count;
  }

  /**
   * Bulk soft-delete multiple products in Neon.
   */
  static async bulkDelete(ids: string[]): Promise<number> {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });
    return result.count;
  }

  /**
   * Bulk delete all products in Neon matching criteria.
   */
  static async deleteAllProducts(filters?: { status?: string; search?: string }): Promise<number> {
    const where: any = { deletedAt: null };

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term, mode: "insensitive" } },
      ];
    }

    const result = await prisma.product.updateMany({
      where,
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });
    return result.count;
  }
}
