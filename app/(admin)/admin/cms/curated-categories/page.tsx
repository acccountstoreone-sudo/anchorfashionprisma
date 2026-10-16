import { Metadata } from "next";
import { getCuratedCategoriesSettings } from "@/actions/curated-categories.actions";
import { CategoryRepository } from "@/lib/repositories/catalog/category.repository";
import { CuratedCategoriesManagerClient } from "@/features/admin/components/cms/CuratedCategoriesManagerClient";

export const metadata: Metadata = {
  title: "Curated Categories (The Style Edit) | CMS Admin",
  description: "Configure which categories and banners appear in the homepage editorial showcase",
};

export default async function CuratedCategoriesAdminPage() {
  const [initialSettings, allCategories] = await Promise.all([
    getCuratedCategoriesSettings(),
    CategoryRepository.getCategories(false),
  ]);

  return (
    <CuratedCategoriesManagerClient
      initialSettings={initialSettings}
      allCategories={allCategories}
    />
  );
}
