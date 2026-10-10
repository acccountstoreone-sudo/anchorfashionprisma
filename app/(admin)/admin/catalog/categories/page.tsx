import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";
import { CategoriesClientPage } from "@/features/admin/components/catalog/CategoriesClientPage";

export const metadata = {
  title: "Categories | Catalog | Anchor Fashion Enterprise",
};

export default async function AdminCategoriesPage() {
  // Fetch all categories including inactive ones for management
  const categories = await CategoryRepository.getCategories(false);

  return <CategoriesClientPage initialCategories={categories} />;
}

