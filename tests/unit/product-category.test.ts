import { describe, it, expect } from "vitest";
import {
  DEFAULT_CURATED_CATEGORIES,
  CuratedCategoriesSettings,
  CuratedCategorySlot,
} from "@/types/curated-categories.types";
import { Category } from "@/types/catalog.types";

describe("Product Category Management", () => {
  describe("Category Hierarchy & Slug Validation", () => {
    it("should format and generate clean category slugs", () => {
      function slugify(name: string): string {
        return name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      expect(slugify("Men's Formal Panjabi")).toBe("mens-formal-panjabi");
      expect(slugify("Festive & Wedding Collection 2026")).toBe("festive-wedding-collection-2026");
      expect(slugify("  Casual Trousers & Chinos  ")).toBe("casual-trousers-chinos");
    });

    it("should construct category parent-child hierarchy tree correctly", () => {
      const flatCategories: Category[] = [
        {
          id: "cat-root-1",
          name: "Men",
          slug: "men",
          parent_id: null,
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat-sub-1",
          name: "Panjabi",
          slug: "panjabi",
          parent_id: "cat-root-1",
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat-sub-2",
          name: "Shirts",
          slug: "shirts",
          parent_id: "cat-root-1",
          display_order: 2,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat-sub-child-1",
          name: "Kabli Panjabi",
          slug: "kabli-panjabi",
          parent_id: "cat-sub-1",
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Build tree
      function buildCategoryTree(categories: Category[], parentId: string | null = null): any[] {
        return categories
          .filter((cat) => cat.parent_id === parentId)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((cat) => ({
            ...cat,
            children: buildCategoryTree(categories, cat.id),
          }));
      }

      const tree = buildCategoryTree(flatCategories);
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("Men");
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].name).toBe("Panjabi");
      expect(tree[0].children[1].name).toBe("Shirts");

      // Verify nested grand-child
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].name).toBe("Kabli Panjabi");
    });

    it("should filter active categories and sort by display order", () => {
      const sampleCategories: Category[] = [
        {
          id: "cat-1",
          name: "Winter Collection",
          slug: "winter",
          parent_id: null,
          display_order: 3,
          is_active: false, // inactive / archived
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat-2",
          name: "Panjabi",
          slug: "panjabi",
          parent_id: null,
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cat-3",
          name: "Outerwear",
          slug: "outerwear",
          parent_id: null,
          display_order: 2,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const activeCategories = sampleCategories
        .filter((c) => c.is_active)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      expect(activeCategories).toHaveLength(2);
      expect(activeCategories[0].slug).toBe("panjabi");
      expect(activeCategories[1].slug).toBe("outerwear");
    });

    it("should generate breadcrumb trail for deep nested categories", () => {
      const categoriesMap = new Map<string, Category>([
        ["cat-root", { id: "cat-root", name: "Men", slug: "men", parent_id: null, is_active: true, created_at: "", updated_at: "" }],
        ["cat-ethnic", { id: "cat-ethnic", name: "Ethnic Wear", slug: "ethnic-wear", parent_id: "cat-root", is_active: true, created_at: "", updated_at: "" }],
        ["cat-panjabi", { id: "cat-panjabi", name: "Silk Panjabi", slug: "silk-panjabi", parent_id: "cat-ethnic", is_active: true, created_at: "", updated_at: "" }],
      ]);

      function getBreadcrumbs(categoryId: string): { name: string; slug: string }[] {
        const crumbs: { name: string; slug: string }[] = [];
        let curr: Category | undefined = categoriesMap.get(categoryId);
        while (curr) {
          crumbs.unshift({ name: curr.name, slug: curr.slug });
          curr = curr.parent_id ? categoriesMap.get(curr.parent_id) : undefined;
        }
        return crumbs;
      }

      const crumbs = getBreadcrumbs("cat-panjabi");
      expect(crumbs).toHaveLength(3);
      expect(crumbs[0]).toEqual({ name: "Men", slug: "men" });
      expect(crumbs[1]).toEqual({ name: "Ethnic Wear", slug: "ethnic-wear" });
      expect(crumbs[2]).toEqual({ name: "Silk Panjabi", slug: "silk-panjabi" });
    });
  });

  describe("Curated Categories Configuration", () => {
    it("should provide valid default curated slots", () => {
      expect(DEFAULT_CURATED_CATEGORIES.isEnabled).toBe(true);
      expect(DEFAULT_CURATED_CATEGORIES.slots.length).toBeGreaterThanOrEqual(4);
      for (const slot of DEFAULT_CURATED_CATEGORIES.slots) {
        expect(slot.id).toBeDefined();
        expect(slot.categoryId).toBeDefined();
      }
    });

    it("should apply customized overrides to a curated category slot", () => {
      const customSlot: CuratedCategorySlot = {
        id: "slot-custom-1",
        categoryId: "04695ef6-3006-453b-a860-6b650bb7de24",
        customTitle: "Royal Eid Collection",
        subtitle: "Handcrafted Luxury",
        customImageUrl: "https://images.unsplash.com/photo-luxury-panjabi.jpg",
      };

      expect(customSlot.customTitle).toBe("Royal Eid Collection");
      expect(customSlot.subtitle).toBe("Handcrafted Luxury");
      expect(customSlot.customImageUrl).toContain("photo-luxury-panjabi.jpg");
    });
  });
});
