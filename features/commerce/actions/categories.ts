import { CatalogRepository, ProductListParams } from "@/repositories/catalog.repository";
import { CatalogService } from "@/lib/services/catalog.service";
import { Category } from "@/types/category";

export const getCategoryBySlug = async (
  slug: string
): Promise<Category | null> => {
  const cleanSlug = slug.toLowerCase().trim();
  const categories = await CatalogRepository.getCategories();
  const matched = (categories as any[]).find(
    (c) => c.slug?.toLowerCase() === cleanSlug
  );
  if (matched) {
    return matched as Category;
  }

  // Virtual fallback category mapping so customers never hit a 404
  const virtualMap: Record<string, string> = {
    men: "Men's Collection",
    mens: "Men's Collection",
    women: "Women's Collection",
    womens: "Women's Collection",
    kids: "Kids' Collection",
    accessories: "Accessories",
    bags: "Bags & Handbags",
    jewellery: "Jewellery & Accessories",
    sale: "Sale & Special Offers",
    ethnic: "Ethnic & Festive Wear",
    "new-in": "New Arrivals",
  };

  const name =
    virtualMap[cleanSlug] ||
    cleanSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return {
    id: `virtual-${cleanSlug}`,
    name,
    slug: cleanSlug,
    isActive: true,
    sortOrder: 99,
  } as unknown as Category;
};

export const getCategories = async (): Promise<Category[]> => {
  const categories = await CatalogRepository.getCategories();
  return (categories || []) as Category[];
};

export const getProducts = async (params?: {
  categoryId?: string;
  categorySlug?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  const slug = params?.categorySlug?.toLowerCase();
  let sortBy: ProductListParams["sortBy"] = "newest";
  if (
    params?.sortBy === "price_asc" ||
    params?.sortBy === "price_desc" ||
    params?.sortBy === "rating" ||
    params?.sortBy === "newest"
  ) {
    sortBy = params.sortBy;
  }

  const { data } = await CatalogRepository.getProducts({
    category: slug,
    brand: params?.brand,
    minPrice: params?.minPrice,
    maxPrice: params?.maxPrice,
    search: params?.search,
    sortBy,
    limit: params?.limit || 24,
    offset: params?.offset || 0,
  });

  return data || [];
};

export const getBrands = async (): Promise<any[]> => {
  const brands = await CatalogService.getBrands();
  return (brands || []) as any[];
};
