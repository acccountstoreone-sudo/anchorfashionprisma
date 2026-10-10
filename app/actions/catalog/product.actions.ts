"use server";

import { revalidatePath } from "next/cache";
import { CreateProductInput, CreateProductSchema } from "@/types/catalog.types";
import { ProductRepository } from "@/lib/repositories/catalog/product.repository";
import { invalidateProductCache } from "@/lib/cache/invalidate-catalog";

export async function createProductAction(input: CreateProductInput) {
  try {
    const validated = CreateProductSchema.parse(input);
    const product = await ProductRepository.createProduct(validated);

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog/products");
    invalidateProductCache(product?.slug);
    return { success: true, data: product };
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return {
      success: false,
      error: error.message || "Failed to create product",
    };
  }
}

export async function updateProductAction(
  id: string,
  input: Partial<CreateProductInput>
) {
  try {
    const product = await ProductRepository.updateProduct(id, input);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath("/admin/catalog/products");
    revalidatePath(`/admin/catalog/products/${id}`);
    invalidateProductCache(product?.slug);
    return { success: true, data: product };
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return {
      success: false,
      error: error.message || "Failed to update product",
    };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await ProductRepository.deleteProduct(id);

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog/products");
    invalidateProductCache();
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    return {
      success: false,
      error: error.message || "Failed to delete product",
    };
  }
}
