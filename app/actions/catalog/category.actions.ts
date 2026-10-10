"use server";

import { revalidatePath } from "next/cache";
import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";

// For simplicity, we just expose basic fetches as actions if needed in client components,
// or we can add create/update actions here.

export async function fetchCategoriesAction(activeOnly: boolean = true) {
  try {
    const data = await CategoryRepository.getCategories(activeOnly);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
