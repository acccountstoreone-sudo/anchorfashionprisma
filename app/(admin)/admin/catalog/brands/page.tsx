import { BrandRepository } from "@/lib/repositories/catalog/brand.repository";
import { BrandsClientPage } from "@/features/admin/components/catalog/BrandsClientPage";

export const metadata = {
  title: "Brands | Catalog | Anchor Fashion Enterprise",
};

export default async function AdminBrandsPage() {
  // Fetch all brands including inactive ones for management
  const brands = await BrandRepository.getBrands(false);

  return <BrandsClientPage initialBrands={brands} />;
}
