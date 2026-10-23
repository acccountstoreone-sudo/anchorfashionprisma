import { prisma } from "@/lib/prisma";
import { CreateProductInput, Product } from "@/types/catalog.types";
import { cache } from "react";
import { generateUniqueProductCode } from "@/lib/utils/product-code";

function mapToAdminProduct(p: any): Product {
  const variants = p.variants || [];
  let totalStock = 0;
  let totalSold = 0;

  const mappedVariants = variants.map((v: any) => {
    const vStock = (v.inventoryLevels || []).reduce(
      (sum: number, lvl: any) => sum + (lvl.quantityAvailable || 0),
      0
    );
    totalStock += vStock;

    const vSold = (v.orderItems || []).reduce(
      (sum: number, oi: any) => sum + (Number(oi.quantity) || 0),
      0
    );
    totalSold += vSold;

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
      soldQuantity: vSold,
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
    categoryIds: (p.productCategories || []).map((pc: any) => pc.categoryId).filter(Boolean),
    additionalCategories: (p.productCategories || [])
      .map((pc: any) => (pc.category ? { id: pc.category.id, name: pc.category.name, slug: pc.category.slug } : null))
      .filter(Boolean),
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
    soldCount: totalSold,
    totalSold: totalSold,
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

      if (categoryId && categoryId !== "ALL") {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { categoryId },
              { productCategories: { some: { categoryId } } },
            ],
          },
        ];
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
            productCategories: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
              },
            },
            variants: {
              include: {
                inventoryLevels: true,
                orderItems: {
                  where: {
                    order: {
                      status: { not: "CANCELLED" },
                    },
                  },
                  select: {
                    quantity: true,
                  },
                },
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
          productCategories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          variants: {
            include: {
              inventoryLevels: true,
              orderItems: {
                where: {
                  order: {
                    status: { not: "CANCELLED" },
                  },
                },
                select: {
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                },
              },
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
    const { seo, tags, media, variants, categoryIds, ...productData } = input;

    // 1. Auto-generate slug if missing
    let finalSlug = productData.slug?.trim();
    if (!finalSlug && productData.name) {
      const baseSlug = productData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    // 2. Auto-generate SKU if missing
    let finalSku = productData.sku?.trim();
    if (!finalSku && productData.name) {
      try {
        finalSku = await generateUniqueProductCode(
          productData.name,
          productData.categoryId || "general",
          "AF"
        );
      } catch {
        const cleanName = productData.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
        finalSku = `AF${cleanName || "PROD"}${Date.now().toString().slice(-4)}`;
      }
    }

    // Check duplicate SKU
    if (finalSku) {
      const existingSku = await prisma.product.findFirst({
        where: { sku: finalSku, deletedAt: null },
        select: { id: true },
      });
      if (existingSku) {
        throw new Error(`A product with SKU "${finalSku}" already exists.`);
      }
    }

    // Check duplicate slug
    if (finalSlug) {
      const existingSlug = await prisma.product.findFirst({
        where: { slug: finalSlug, deletedAt: null },
        select: { id: true },
      });
      if (existingSlug) {
        throw new Error(`A product with URL slug "${finalSlug}" already exists.`);
      }
    }

    const defaultWarehouseId = (productData as any).warehouseId || (await ProductRepository.getDefaultWarehouseId());
    const reorderPoint = Number((productData as any).alertQuantity ?? (productData as any).reorderPoint ?? 10);

    // Primary image from media
    const primaryMediaUrl = media?.find((m: any) => m.isPrimary)?.url || media?.[0]?.url || null;

    let productId = "";

    await prisma.$transaction(async (tx) => {
      // Create the product in Neon
      const createdProduct = await tx.product.create({
        data: {
          name: productData.name,
          slug: finalSlug || `product-${Date.now()}`,
          shortDescription: productData.shortDescription,
          description: productData.description,
          categoryId: productData.categoryId,
          brandId: productData.brandId || null,
          basePrice: productData.basePrice,
          costPrice: productData.costPrice ?? null,
          salePrice: productData.salePrice ?? null,
          sku: finalSku || null,
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

      productId = createdProduct.id;

      // Create SEO
      if (seo) {
        await tx.productSeo.create({
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
        await tx.productTag.createMany({
          data: tags.map((tagId) => ({
            productId,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Link Multiple Categories
      const allCatIds = Array.from(
        new Set([productData.categoryId, ...(categoryIds || [])].filter((c): c is string => Boolean(c) && typeof c === "string"))
      );
      if (allCatIds.length > 0) {
        await tx.productCategory.createMany({
          data: allCatIds.map((cId) => ({
            productId,
            categoryId: cId,
          })),
          skipDuplicates: true,
        });
      }

      // Create Media
      if (media && media.length > 0) {
        await tx.productMedia.createMany({
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
          const createdVariant = await tx.variant.create({
            data: {
              productId,
              sku,
              barcode: v.barcode && v.barcode.trim() ? v.barcode.trim() : null,
              priceOverride: v.priceOverride ?? null,
              salePrice: v.salePrice ?? null,
              costPrice: v.costPrice ?? null,
              weight: v.weight ?? null,
              attributes: v.attributes || {},
              isActive: v.isActive ?? true,
            },
          });

          if (defaultWarehouseId) {
            await tx.inventoryLevel.create({
              data: {
                variantId: createdVariant.id,
                warehouseId: defaultWarehouseId,
                quantityAvailable: Number(v.stockQuantity ?? 0),
                quantityReserved: 0,
                reorderPoint,
              },
            });

            if (Number(v.stockQuantity ?? 0) > 0) {
              await tx.stockMovement.create({
                data: {
                  variantId: createdVariant.id,
                  warehouseId: defaultWarehouseId,
                  movementType: "IN",
                  quantity: Number(v.stockQuantity),
                  previousQuantity: 0,
                  newQuantity: Number(v.stockQuantity),
                  referenceType: "INITIAL_STOCK",
                  referenceId: productId,
                  notes: `Initial opening stock intake for ${createdProduct.name} (${sku})`,
                },
              });
            }
          }
        }
      } else {
        // Single default variant
        const defaultSku = productData.sku?.trim() || `${createdProduct.slug.toUpperCase()}-DEF`;
        const createdVariant = await tx.variant.create({
          data: {
            productId,
            sku: defaultSku,
            barcode: productData.barcode && productData.barcode.trim() ? productData.barcode.trim() : null,
            priceOverride: productData.basePrice,
            salePrice: productData.salePrice ?? null,
            costPrice: productData.costPrice ?? null,
            attributes: { Standard: "Default" },
            isActive: true,
          },
        });

        if (defaultWarehouseId) {
          await tx.inventoryLevel.create({
            data: {
              variantId: createdVariant.id,
              warehouseId: defaultWarehouseId,
              quantityAvailable: Number(productData.stockQuantity ?? 0),
              quantityReserved: 0,
              reorderPoint,
            },
          });

          if (Number(productData.stockQuantity ?? 0) > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: createdVariant.id,
                warehouseId: defaultWarehouseId,
                movementType: "IN",
                quantity: Number(productData.stockQuantity),
                previousQuantity: 0,
                newQuantity: Number(productData.stockQuantity),
                referenceType: "INITIAL_STOCK",
                referenceId: productId,
                notes: `Initial opening stock intake for ${createdProduct.name}`,
              },
            });
          }
        }
      }
    }, { maxWait: 20000, timeout: 60000 });

    return this.getProductById(productId);
  }

  /**
   * Updates an existing product.
   */
  static async updateProduct(id: string, input: Partial<CreateProductInput>) {
    const { seo, tags, media, variants, categoryIds, ...productData } = input;

    const primaryMediaUrl = media?.find((m: any) => m.isPrimary)?.url || media?.[0]?.url || undefined;

    await prisma.$transaction(async (tx) => {
      // 1. Update core product fields
      await tx.product.update({
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
        await tx.productSeo.upsert({
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
        await tx.productTag.deleteMany({ where: { productId: id } });
        if (tags.length > 0) {
          await tx.productTag.createMany({
            data: tags.map((tagId) => ({
              productId: id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3b. Update Additional / Multiple Categories
      if (categoryIds !== undefined || productData.categoryId !== undefined) {
        let primaryId = productData.categoryId;
        if (!primaryId) {
          const current = await tx.product.findUnique({ where: { id }, select: { categoryId: true } });
          primaryId = current?.categoryId || undefined;
        }
        const allCatIds = Array.from(
          new Set([primaryId, ...(categoryIds || [])].filter((c): c is string => Boolean(c) && typeof c === "string"))
        );
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (allCatIds.length > 0) {
          await tx.productCategory.createMany({
            data: allCatIds.map((cId) => ({
              productId: id,
              categoryId: cId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 4. Update Media
      if (media !== undefined) {
        await tx.productMedia.deleteMany({ where: { productId: id } });
        if (media.length > 0) {
          await tx.productMedia.createMany({
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

      // 5. Update Variants Safely without foreign key violations
      if (variants !== undefined || productData.stockQuantity !== undefined) {
        const defaultWarehouseId = await ProductRepository.getDefaultWarehouseId();

        if (variants && variants.length > 0) {
          const existingVariants = await tx.variant.findMany({
            where: { productId: id },
          });

          const processedVariantIds = new Set<string>();

          for (const [idx, v] of variants.entries()) {
            const sku = v.sku?.trim() || `${id.slice(0, 8).toUpperCase()}-V${idx + 1}`;
            
            // Match existing by id or by sku
            const existing = existingVariants.find(
              (ev) => (v.id && ev.id === v.id) || (ev.sku && ev.sku.toLowerCase() === sku.toLowerCase())
            );

            let targetVariantId: string;

            if (existing) {
              targetVariantId = existing.id;
              processedVariantIds.add(existing.id);

              await tx.variant.update({
                where: { id: existing.id },
                data: {
                  sku,
                  barcode: v.barcode && v.barcode.trim() ? v.barcode.trim() : null,
                  priceOverride: v.priceOverride ?? null,
                  salePrice: v.salePrice ?? null,
                  costPrice: v.costPrice ?? null,
                  weight: v.weight ?? null,
                  attributes: v.attributes || {},
                  isActive: v.isActive ?? true,
                },
              });
            } else {
              const createdVariant = await tx.variant.create({
                data: {
                  productId: id,
                  sku,
                  barcode: v.barcode && v.barcode.trim() ? v.barcode.trim() : null,
                  priceOverride: v.priceOverride ?? null,
                  salePrice: v.salePrice ?? null,
                  costPrice: v.costPrice ?? null,
                  weight: v.weight ?? null,
                  attributes: v.attributes || {},
                  isActive: v.isActive ?? true,
                },
              });
              targetVariantId = createdVariant.id;
              processedVariantIds.add(createdVariant.id);
            }

            if (defaultWarehouseId && v.stockQuantity !== undefined) {
              const currentLevel = await tx.inventoryLevel.findUnique({
                where: {
                  variantId_warehouseId: {
                    variantId: targetVariantId,
                    warehouseId: defaultWarehouseId,
                  },
                },
              });

              const prevQty = currentLevel?.quantityAvailable || 0;
              const newQty = Number(v.stockQuantity ?? 0);

              await tx.inventoryLevel.upsert({
                where: {
                  variantId_warehouseId: {
                    variantId: targetVariantId,
                    warehouseId: defaultWarehouseId,
                  },
                },
                update: {
                  quantityAvailable: newQty,
                },
                create: {
                  variantId: targetVariantId,
                  warehouseId: defaultWarehouseId,
                  quantityAvailable: newQty,
                  quantityReserved: 0,
                  reorderPoint: 10,
                },
              });

              if (newQty !== prevQty) {
                const diff = newQty - prevQty;
                await tx.stockMovement.create({
                  data: {
                    variantId: targetVariantId,
                    warehouseId: defaultWarehouseId,
                    movementType: diff > 0 ? "IN" : "OUT",
                    quantity: diff,
                    previousQuantity: prevQty,
                    newQuantity: newQty,
                    referenceType: "STOCK_ADJUSTMENT",
                    referenceId: id,
                    notes: `Stock updated via product editor: ${diff > 0 ? `+${diff}` : diff} units`,
                  },
                });
              }
            }
          }

          // Safely handle obsolete variants without violating foreign key constraints
          for (const ev of existingVariants) {
            if (!processedVariantIds.has(ev.id)) {
              const hasOrders = await tx.orderItem.count({ where: { variantId: ev.id } });
              if (hasOrders > 0) {
                // If referenced by previous order items, deactivate rather than delete
                await tx.variant.update({
                  where: { id: ev.id },
                  data: { isActive: false },
                });
              } else {
                // Safe to remove inventory levels and variant
                await tx.inventoryLevel.deleteMany({ where: { variantId: ev.id } });
                await tx.cartItem.deleteMany({ where: { variantId: ev.id } });
                await tx.variant.delete({ where: { id: ev.id } });
              }
            }
          }
        } else if (productData.stockQuantity !== undefined) {
          const existingVariants = await tx.variant.findMany({
            where: { productId: id },
            take: 1,
          });

          if (existingVariants.length > 0) {
            const varId = existingVariants[0].id;
            if (defaultWarehouseId) {
              await tx.inventoryLevel.upsert({
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
    }, { maxWait: 20000, timeout: 60000 });

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
