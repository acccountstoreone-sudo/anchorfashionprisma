"use server";

import { z } from "zod";
import { createAdminAction } from "@/lib/actions/safe-action";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { invalidateCategoryCache } from "@/lib/cache/invalidate-catalog";
import { verifyStaff } from "@/lib/security/roles";

// Add products to category (Many-to-Many)
export const addProductsToCategoryAction = createAdminAction(
  z.object({
    categoryId: z.string().uuid(),
    productIds: z.array(z.string().uuid())
  }),
  async ({ categoryId, productIds }) => {
    // We insert into product_categories join table
    for (const productId of productIds) {
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId,
            categoryId
          }
        },
        update: {},
        create: {
          productId,
          categoryId
        }
      });
    }

    revalidatePath(`/admin/catalog/categories/${categoryId}`);
    revalidatePath("/admin/catalog/categories");
    invalidateCategoryCache();
    
    return { success: true, count: productIds.length };
  }
);

// Remove product from category
export const removeProductFromCategoryAction = createAdminAction(
  z.object({
    categoryId: z.string().uuid(),
    productId: z.string().uuid()
  }),
  async ({ categoryId, productId }) => {
    try {
      await prisma.productCategory.delete({
        where: {
          productId_categoryId: {
            productId,
            categoryId
          }
        }
      });
    } catch (e) {
      // Ignore if not found
    }

    revalidatePath(`/admin/catalog/categories/${categoryId}`);
    invalidateCategoryCache();
    return { success: true };
  }
);

// Internal domain function for price synchronization
export async function syncProductPrices(
  productId: string,
  basePrice: number,
  salePrice?: number | null,
  costPrice?: number | null
) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        basePrice,
        salePrice,
        costPrice,
      },
    });

    // Synchronize price update to single/default variants so customer checkout reflects the price change
    const variants = await tx.variant.findMany({
      where: { productId },
    });

    if (variants.length === 1) {
      await tx.variant.update({
        where: { id: variants[0].id },
        data: {
          priceOverride: basePrice,
          salePrice: salePrice ?? null,
          costPrice: costPrice ?? null,
        },
      });
    }
  });

  try {
    revalidatePath("/admin/catalog/categories/[id]", "page");
    revalidatePath("/admin/catalog/products");
    revalidatePath("/admin/products");
  } catch {
    // Revalidation not applicable in standalone test contexts
  }
}

// Update product prices (Inline edit)
export const updateProductPricesAction = createAdminAction(
  z.object({
    productId: z.string().uuid(),
    basePrice: z.number().min(0),
    salePrice: z.number().nullable().optional(),
    costPrice: z.number().nullable().optional(),
  }),
  async ({ productId, basePrice, salePrice, costPrice }) => {
    await syncProductPrices(productId, basePrice, salePrice, costPrice);
    return { success: true };
  }
);
