"use server";


import { z } from "zod";
import { createAdminAction } from "../safe-action";
import { ProductRepository } from "@/lib/repositories/catalog/product.repository";
import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";
import { BrandRepository } from "@/lib/repositories/catalog/brand.repository";
import { TagRepository } from "@/lib/repositories/catalog/tag.repository";
import { CreateProductSchema } from "@/types/catalog.types";
import { revalidatePath } from "next/cache";
import { invalidateProductCache } from "@/lib/cache/invalidate-catalog";

// ============================================================================
// SCHEMAS
// ============================================================================

const GetAdminProductsSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  status: z.string().optional(),
});

const ProductIdSchema = z.object({
  id: z.string().uuid(),
});

const BulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().uuid()),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()),
});

const EmptySchema = z.object({});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Fetch all products for the admin table with filtering/pagination.
 */
export const getAdminProductsAction = createAdminAction(
  GetAdminProductsSchema,
  async (input) => {
    return await ProductRepository.getProducts(input);
  }
);

/**
 * Fetch a single product by ID for the edit form.
 */
export const getAdminProductByIdAction = createAdminAction(
  ProductIdSchema,
  async ({ id }) => {
    return await ProductRepository.getProductById(id);
  }
);

/**
 * Create a new product.
 */
export const createAdminProductAction = createAdminAction(
  CreateProductSchema,
  async (input) => {
    const payload = {
      ...input,
      status: input.status || "DRAFT",
      isFeatured: input.isFeatured || false,
      media: input.media?.map((m: any) => ({
        ...m,
        displayOrder: m.displayOrder || 0,
      })),
    };
    const newProduct = await ProductRepository.createProduct(payload as any);
    revalidatePath("/admin/products");
    invalidateProductCache(newProduct?.slug);
    return newProduct;
  }
);

/**
 * Update an existing product.
 */
export const updateAdminProductAction = createAdminAction(
  z.object({ id: z.string().uuid(), data: CreateProductSchema.partial() }),
  async ({ id, data }) => {
    const payload = {
      ...data,
      media: data.media?.map((m: any) => ({
        ...m,
        displayOrder: m.displayOrder || 0,
      })),
    };
    const updatedProduct = await ProductRepository.updateProduct(
      id,
      payload as any
    );
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    invalidateProductCache(updatedProduct?.slug);
    return updatedProduct;
  }
);

/**
 * Soft delete a product.
 */
export const deleteAdminProductAction = createAdminAction(
  ProductIdSchema,
  async ({ id }) => {
    await ProductRepository.deleteProduct(id);
    revalidatePath("/admin/products");
    invalidateProductCache();
    return { success: true };
  }
);

/**
 * Duplicate a product (Creates a copy).
 */
export const duplicateAdminProductAction = createAdminAction(
  ProductIdSchema,
  async ({ id }) => {
    const original = await ProductRepository.getProductById(id);
    if (!original) throw new Error("Product not found");

    const copyData = {
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      shortDescription: original.shortDescription || "",
      description: original.description || "",
      categoryId: original.categoryId,
      brandId: original.brandId || undefined,
      basePrice: original.basePrice,
      sku: original.sku ? `${original.sku}-COPY-${Date.now().toString(36).toUpperCase()}` : undefined,
      status: "DRAFT" as const, // Always draft on copy
      isFeatured: false,
      // ... we could copy SEO and Media too, but keeping it simple for now
    };

    const newProduct = await ProductRepository.createProduct(copyData as any);
    revalidatePath("/admin/products");
    invalidateProductCache(newProduct?.slug);
    return newProduct;
  }
);

/**
 * Bulk publish or archive products — single DB query via .in().
 */
export const bulkUpdateProductStatusAction = createAdminAction(
  BulkUpdateStatusSchema,
  async ({ ids, status }) => {
    const count = await ProductRepository.bulkUpdateStatus(ids, status);
    revalidatePath("/admin/products");
    invalidateProductCache();
    return { count };
  }
);

/**
 * Bulk delete products — single DB query via .in().
 */
export const bulkDeleteProductsAction = createAdminAction(
  BulkDeleteSchema,
  async ({ ids }) => {
    const count = await ProductRepository.bulkDelete(ids);
    revalidatePath("/admin/products");
    invalidateProductCache();
    return { count };
  }
);

const BulkDeleteAllSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
});

/**
 * Bulk delete all products matching optional filter criteria, or all non-deleted products.
 */
export const bulkDeleteAllProductsAction = createAdminAction(
  BulkDeleteAllSchema,
  async (filters) => {
    const count = await ProductRepository.deleteAllProducts(filters);
    revalidatePath("/admin/products");
    invalidateProductCache();
    return { count };
  }
);

/**
 * Fetch all categories for forms.
 */
export const getCategoriesAction = createAdminAction(EmptySchema, async () => {
  return await CategoryRepository.getCategories();
});

/**
 * Fetch all brands for forms.
 */
export const getBrandsAction = createAdminAction(EmptySchema, async () => {
  return await BrandRepository.getBrands();
});

/**
 * Fetch all tags for forms.
 */
export const getTagsAction = createAdminAction(EmptySchema, async () => {
  return await TagRepository.getTags();
});
