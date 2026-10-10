"use client";

import { useEffect } from "react";
import { usePersonalizationStore } from "@/stores/use-personalization-store";

export function ProductViewTracker({ product }: { product: any }) {
  const { addRecentlyViewed } = usePersonalizationStore();

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
    }
  }, [product, addRecentlyViewed]);

  return null;
}
