import { getPublicSupabaseClient } from "@/lib/supabase/public";
import { CatalogService } from "@/lib/services/catalog.service";
import { Category } from "@/types/category";

export const getCategoryBySlug = async (
  slug: string
): Promise<Category | null> => {
  const cleanSlug = slug.toLowerCase().trim();
  const categories = await CatalogService.getCategories();
  const matched = (categories as any[]).find(
    (c) => c.slug?.toLowerCase() === cleanSlug
  );
  if (matched) {
    return matched as Category;
  }

  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", cleanSlug)
    .single();

  if (!error && data) {
    return data as Category;
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
  const categories = await CatalogService.getCategories();
  return (categories || []) as Category[];
};

export const getProducts = async (params?: {
  categoryId?: string;
  categorySlug?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  const supabase = getPublicSupabaseClient();
  let query = (supabase.from("products") as any)
    .select(
      `
      *,
      categories (name, slug),
      brands (name, slug),
      product_media (url, alt_text, is_primary)
    `
    )
    .eq("status", "ACTIVE")
    .is("deleted_at", null);

  const slug = params?.categorySlug?.toLowerCase();

  // Filter by category ID if it's a real database category ID
  if (params?.categoryId && !params.categoryId.startsWith("virtual-")) {
    const allCategories = await CatalogService.getCategories();
    const childIds = (allCategories as any[])
      .filter((c) => c.parentId === params.categoryId || c.parent_id === params.categoryId)
      .map((c) => c.id);
    const categoryIds = [params.categoryId, ...childIds];

    if (categoryIds.length > 1) {
      query = query.in("category_id", categoryIds);
    } else {
      query = query.eq("category_id", params.categoryId);
    }
  } else if (slug) {
    if (slug === "sale") {
      query = query.not("sale_price", "is", null);
    } else if (slug === "men" || slug === "mens") {
      query = query.or(
        "gender.eq.MALE,name.ilike.%men%,name.ilike.%polo%,name.ilike.%shirt%,name.ilike.%jacket%"
      );
    } else if (slug === "women" || slug === "womens") {
      query = query.or(
        "gender.eq.FEMALE,name.ilike.%dress%,name.ilike.%kameez%,name.ilike.%women%,name.ilike.%top%"
      );
    } else if (slug === "kids") {
      query = query.or(
        "gender.eq.KIDS,name.ilike.%kid%,name.ilike.%boys%,name.ilike.%girls%"
      );
    } else if (slug === "dresses") {
      query = query.or(
        "name.ilike.%dress%,name.ilike.%gown%,name.ilike.%frock%"
      );
    } else if (slug === "tops") {
      query = query.or(
        "name.ilike.%top%,name.ilike.%shirt%,name.ilike.%t-shirt%,name.ilike.%tshirt%,name.ilike.%blouse%"
      );
    } else if (slug === "jeans") {
      query = query.or(
        "name.ilike.%jean%,name.ilike.%denim%,name.ilike.%pant%,name.ilike.%trouser%"
      );
    } else if (slug === "accessories" || slug === "bags" || slug === "jewellery") {
      query = query.or(
        "name.ilike.%cap%,name.ilike.%bag%,name.ilike.%jewel%,name.ilike.%belt%,name.ilike.%accessory%"
      );
    }
  }

  // Sort orders
  if (params?.sortBy === "price_asc") {
    query = query.order("base_price", { ascending: true });
  } else if (params?.sortBy === "price_desc") {
    query = query.order("base_price", { ascending: false });
  } else if (params?.sortBy === "rating") {
    query = query.order("average_rating", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (params?.limit) {
    const offset = params.offset ?? 0;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
};

export const getBrands = async (): Promise<any[]> => {
  const brands = await CatalogService.getBrands();
  return (brands || []) as any[];
};
