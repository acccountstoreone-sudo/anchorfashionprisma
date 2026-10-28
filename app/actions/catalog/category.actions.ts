"use server";

import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";

export async function fetchCategoriesAction(activeOnly: boolean = true) {
  try {
    const data = await CategoryRepository.getCategories(activeOnly);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
