"use server";

import { z } from "zod";
import { createAdminAction } from "@/lib/actions/safe-action";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { invalidateCategoryCache } from "@/lib/cache/invalidate-catalog";

const prisma = new PrismaClient();

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

// Update product prices (Inline edit)
export const updateProductPricesAction = createAdminAction(
  z.object({
    productId: z.string().uuid(),
    basePrice: z.number().min(0),
    salePrice: z.number().nullable().optional(),
    costPrice: z.number().nullable().optional(),
  }),
  async ({ productId, basePrice, salePrice, costPrice }) => {
    await prisma.product.update({
      where: { id: productId },
      data: {
        basePrice,
        salePrice,
        costPrice
      }
    });

    revalidatePath("/admin/catalog/categories/[id]", "page");
    revalidatePath("/admin/catalog/products");
    return { success: true };
  }
);
