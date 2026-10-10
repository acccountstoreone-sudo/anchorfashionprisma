import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MinimalProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price?: number;
  product_media: { url: string; alt_text: string; is_primary: boolean }[];
  categories?: { name: string; slug: string };
  status: string;
}

interface PersonalizationState {
  recentlyViewed: MinimalProduct[];
  addRecentlyViewed: (product: any) => void;
  clearRecentlyViewed: () => void;
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set) => ({
      recentlyViewed: [],

      addRecentlyViewed: (product) =>
        set((state) => {
          // Remove if it already exists to put it at the front
          const filtered = state.recentlyViewed.filter((p) => p.id !== product.id);
          const minimalProduct: MinimalProduct = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            base_price: product.base_price,
            sale_price: product.sale_price,
            product_media: product.product_media,
            categories: product.categories,
            status: product.status,
          };
          return {
            recentlyViewed: [minimalProduct, ...filtered].slice(0, 10), // Keep max 10
          };
        }),

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),
    }),
    {
      name: "af-personalization",
    }
  )
);
