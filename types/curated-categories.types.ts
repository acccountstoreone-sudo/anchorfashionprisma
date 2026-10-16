export type CuratedCategorySlot = {
  id: string; // e.g. "slot-1", "slot-2", "slot-3", "slot-4"
  categoryId: string; // UUID from Category table
  subtitle?: string; // e.g. "Classic & Contemporary", "Signature Collection", "Shop Now"
  customTitle?: string; // Optional custom title override
  customImageUrl?: string; // Optional custom promotional image URL
};

export type CuratedCategoriesSettings = {
  isEnabled: boolean;
  badge: string; // e.g. "The Style Edit"
  title: string; // e.g. "Curated Categories"
  description: string; // e.g. "Explore our most sought-after silhouettes and luxury tailoring, designed for modern elegance."
  viewAllText: string; // e.g. "Shop All Categories"
  viewAllLink: string; // e.g. "/categories"
  slots: CuratedCategorySlot[];
};

export type CuratedCategoryItem = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  subtitle: string;
  imageUrl: string | null;
  displayOrder: number;
};

export type CuratedCategoriesData = {
  settings: CuratedCategoriesSettings;
  items: CuratedCategoryItem[];
};

export const DEFAULT_CURATED_CATEGORIES: CuratedCategoriesSettings = {
  isEnabled: true,
  badge: "The Style Edit",
  title: "Curated Categories",
  description:
    "Explore our most sought-after silhouettes and luxury tailoring, designed for modern elegance.",
  viewAllText: "Shop All Categories",
  viewAllLink: "/categories",
  slots: [
    {
      id: "slot-1",
      categoryId: "",
      subtitle: "Classic & Contemporary",
    },
    {
      id: "slot-2",
      categoryId: "",
      subtitle: "Signature Collection",
    },
    {
      id: "slot-3",
      categoryId: "",
      subtitle: "Shop Now",
    },
    {
      id: "slot-4",
      categoryId: "",
      subtitle: "Shop Now",
    },
  ],
};
