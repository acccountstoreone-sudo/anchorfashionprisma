import { describe, it, expect } from "vitest";

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  parent_id?: string | null;
}

interface TreeNode {
  category: CategoryItem;
  children: TreeNode[];
  level: number;
  path: string;
}

// Tree building utility matching CategoryHierarchySelector.tsx
function buildCategoryHierarchyTree(categories: CategoryItem[]): {
  tree: TreeNode[];
  flatWithPaths: Array<{ category: CategoryItem; path: string; level: number }>;
} {
  const normalized = categories.map((c) => ({
    ...c,
    parentId: c.parentId ?? c.parent_id ?? null,
  }));

  const childrenMap = new Map<string, CategoryItem[]>();
  for (const cat of normalized) {
    const pid = cat.parentId || "root";
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(cat);
  }

  const flatPaths: Array<{ category: CategoryItem; path: string; level: number }> = [];

  function buildBranch(pid: string, level: number, parentPath: string): TreeNode[] {
    const items = childrenMap.get(pid) || [];
    items.sort((a, b) => a.name.localeCompare(b.name));

    return items.map((cat) => {
      const currentPath = parentPath ? `${parentPath} → ${cat.name}` : cat.name;
      flatPaths.push({ category: cat, path: currentPath, level });
      const children = buildBranch(cat.id, level + 1, currentPath);
      return {
        category: cat,
        children,
        level,
        path: currentPath,
      };
    });
  }

  const roots = buildBranch("root", 0, "");
  return { tree: roots, flatWithPaths: flatPaths };
}

// Multi-category toggle and primary category resolution
function toggleCategorySelection(
  currentSelected: string[],
  currentPrimary: string | null,
  toggledId: string
): { nextSelected: string[]; nextPrimary: string | null } {
  const isSelected = currentSelected.includes(toggledId);
  let nextSelected: string[];
  let nextPrimary = currentPrimary;

  if (isSelected) {
    nextSelected = currentSelected.filter((id) => id !== toggledId);
    if (currentPrimary === toggledId) {
      nextPrimary = nextSelected.length > 0 ? nextSelected[0] : null;
    }
  } else {
    nextSelected = [...currentSelected, toggledId];
    if (!currentPrimary || !nextSelected.includes(currentPrimary)) {
      nextPrimary = toggledId;
    }
  }

  return { nextSelected, nextPrimary };
}

// Inventory Gate Check
function validateProductSubmissionInventoryGate(params: {
  isEditMode: boolean;
  linkedProductId?: string | null;
  activeInventoryId?: string | null;
}): { allowed: boolean; error?: string } {
  const hasLinkedInventory = Boolean(params.linkedProductId || params.activeInventoryId);
  if (!params.isEditMode && !hasLinkedInventory) {
    return {
      allowed: false,
      error: "Inventory product required! You cannot add a product without selecting an inventory product first.",
    };
  }
  return { allowed: true };
}

describe("WordPress-Style Category Hierarchy & Inventory-First Gate Policy", () => {
  const sampleCategories: CategoryItem[] = [
    { id: "cat-root-outerwear", name: "OUTERWEAR", slug: "outerwear", parentId: null },
    { id: "cat-sub-jacket", name: "Jacket", slug: "jacket", parentId: "cat-root-outerwear" },
    { id: "cat-sub-blazer", name: "Casual Blazer", slug: "casual-blazer", parentId: "cat-root-outerwear" },
    { id: "cat-grandchild-denim-jacket", name: "Denim Jacket", slug: "denim-jacket", parentId: "cat-sub-jacket" },
    { id: "cat-root-collections", name: "COLLECTIONS", slug: "collections", parentId: null },
    { id: "cat-sub-festive", name: "Festive Collection", slug: "festive-collection", parentId: "cat-root-collections" },
    { id: "cat-sub-new", name: "New Arrivals", slug: "new-arrivals", parentId: "cat-root-collections" },
  ];

  describe("Hierarchical Tree Construction", () => {
    it("should build 3-level deep hierarchy tree accurately", () => {
      const { tree, flatWithPaths } = buildCategoryHierarchyTree(sampleCategories);

      expect(tree).toHaveLength(2); // COLLECTIONS and OUTERWEAR
      const outerwear = tree.find((t) => t.category.id === "cat-root-outerwear");
      expect(outerwear).toBeDefined();
      expect(outerwear?.children).toHaveLength(2); // Casual Blazer & Jacket

      const jacket = outerwear?.children.find((c) => c.category.id === "cat-sub-jacket");
      expect(jacket).toBeDefined();
      expect(jacket?.children).toHaveLength(1);
      expect(jacket?.children[0].category.id).toBe("cat-grandchild-denim-jacket");

      // Verify breadcrumb paths
      const denimPath = flatWithPaths.find((f) => f.category.id === "cat-grandchild-denim-jacket");
      expect(denimPath?.path).toBe("OUTERWEAR → Jacket → Denim Jacket");
      expect(denimPath?.level).toBe(2);
    });
  });

  describe("Multiple Category Selection & Primary Category Logic", () => {
    it("should auto-assign first selected category as Primary", () => {
      const res1 = toggleCategorySelection([], null, "cat-sub-jacket");
      expect(res1.nextSelected).toEqual(["cat-sub-jacket"]);
      expect(res1.nextPrimary).toBe("cat-sub-jacket");
    });

    it("should allow selecting multiple categories while preserving Primary", () => {
      let state = { nextSelected: ["cat-sub-jacket"], nextPrimary: "cat-sub-jacket" as string | null };

      // Select Festive Collection as secondary category
      state = toggleCategorySelection(state.nextSelected, state.nextPrimary, "cat-sub-festive");
      expect(state.nextSelected).toEqual(["cat-sub-jacket", "cat-sub-festive"]);
      expect(state.nextPrimary).toBe("cat-sub-jacket");

      // Select New Arrivals as 3rd category
      state = toggleCategorySelection(state.nextSelected, state.nextPrimary, "cat-sub-new");
      expect(state.nextSelected).toHaveLength(3);
      expect(state.nextPrimary).toBe("cat-sub-jacket");
    });

    it("should promote next category to Primary when current Primary is unselected", () => {
      let state = {
        nextSelected: ["cat-sub-jacket", "cat-sub-festive", "cat-sub-new"],
        nextPrimary: "cat-sub-jacket" as string | null,
      };

      // Unselect current primary
      state = toggleCategorySelection(state.nextSelected, state.nextPrimary, "cat-sub-jacket");
      expect(state.nextSelected).toEqual(["cat-sub-festive", "cat-sub-new"]);
      expect(state.nextPrimary).toBe("cat-sub-festive");
    });

    it("should format sanitized categoryIds payload for database write", () => {
      const primaryCatId = "cat-sub-jacket";
      const secondaryCatIds = ["cat-sub-festive", "cat-sub-new", "cat-sub-jacket"]; // with duplicate

      const allCatIds = Array.from(new Set([primaryCatId, ...secondaryCatIds].filter(Boolean)));
      expect(allCatIds).toEqual(["cat-sub-jacket", "cat-sub-festive", "cat-sub-new"]);
      expect(allCatIds).toHaveLength(3);
    });
  });

  describe("Inventory-First Policy Gate", () => {
    it("should strictly block creating product when no inventory item is selected", () => {
      const attempt = validateProductSubmissionInventoryGate({
        isEditMode: false,
        linkedProductId: null,
        activeInventoryId: null,
      });

      expect(attempt.allowed).toBe(false);
      expect(attempt.error).toContain("Inventory product required");
    });

    it("should allow submission when linked to an existing inventory item", () => {
      const attempt = validateProductSubmissionInventoryGate({
        isEditMode: false,
        linkedProductId: "inv-prod-uuid-1234",
        activeInventoryId: "inv-prod-uuid-1234",
      });

      expect(attempt.allowed).toBe(true);
      expect(attempt.error).toBeUndefined();
    });

    it("should allow submission when editing an already created catalog product", () => {
      const attempt = validateProductSubmissionInventoryGate({
        isEditMode: true,
        linkedProductId: null,
        activeInventoryId: null,
      });

      expect(attempt.allowed).toBe(true);
      expect(attempt.error).toBeUndefined();
    });
  });

  // ─── 4. CATEGORY-WISE INVENTORY DISCOVERY & FILTERING ─────────────
  describe("Category-Wise Inventory Discovery & Rollup Logic", () => {
    const categories: CategoryItem[] = [
      { id: "cat-men", name: "Men's Collection", parentId: null },
      { id: "cat-shirts", name: "Shirts", parentId: "cat-men" },
      { id: "cat-formal-shirts", name: "Formal Shirts", parentId: "cat-shirts" },
      { id: "cat-panjabi", name: "Panjabi", parentId: "cat-men" },
      { id: "cat-women", name: "Women's Collection", parentId: null },
      { id: "cat-saree", name: "Saree", parentId: "cat-women" },
    ];

    const mockInventoryProducts = [
      { id: "p1", name: "White Formal Shirt", sku: "AF-FS-01", categoryId: "cat-formal-shirts", category: "Formal Shirts" },
      { id: "p2", name: "Royal Silk Panjabi", sku: "AF-PJ-01", categoryId: "cat-panjabi", category: "Panjabi" },
      { id: "p3", name: "Cotton Casual Shirt", sku: "AF-CS-02", categoryId: "cat-shirts", category: "Shirts" },
      { id: "p4", name: "Jamdani Saree", sku: "AF-SR-01", categoryId: "cat-saree", category: "Saree" },
    ];

    it("should recursively resolve all descendant category IDs under a parent category", () => {
      function getDescendants(parentId: string, allCats: CategoryItem[]): string[] {
        const matching = new Set<string>([parentId]);
        let added = true;
        while (added) {
          added = false;
          for (const c of allCats) {
            const pid = c.parentId ?? c.parent_id;
            if (pid && matching.has(pid) && !matching.has(c.id)) {
              matching.add(c.id);
              added = true;
            }
          }
        }
        return Array.from(matching);
      }

      // "Men's Collection" should include "cat-men", "cat-shirts", "cat-formal-shirts", "cat-panjabi"
      const menDescendants = getDescendants("cat-men", categories);
      expect(menDescendants).toContain("cat-men");
      expect(menDescendants).toContain("cat-shirts");
      expect(menDescendants).toContain("cat-formal-shirts");
      expect(menDescendants).toContain("cat-panjabi");
      expect(menDescendants).not.toContain("cat-women");
      expect(menDescendants).not.toContain("cat-saree");

      // Filtering products with menDescendants should find 3 out of 4 products
      const menProducts = mockInventoryProducts.filter((p) => menDescendants.includes(p.categoryId));
      expect(menProducts).toHaveLength(3);
      expect(menProducts.map((p) => p.sku)).toEqual(["AF-FS-01", "AF-PJ-01", "AF-CS-02"]);
    });

    it("should calculate recursive category item counts for parent department tabs", () => {
      const directCounts: Record<string, number> = {
        "cat-formal-shirts": 5,
        "cat-shirts": 3,
        "cat-panjabi": 8,
        "cat-saree": 12,
      };

      const childrenMap = new Map<string, string[]>();
      for (const c of categories) {
        if (c.parentId) {
          if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
          childrenMap.get(c.parentId)!.push(c.id);
        }
      }

      function getRollupCount(catId: string): number {
        let count = directCounts[catId] || 0;
        const children = childrenMap.get(catId) || [];
        for (const ch of children) {
          count += getRollupCount(ch);
        }
        return count;
      }

      // Men's Collection total = 5 (formal) + 3 (shirts) + 8 (panjabi) = 16
      expect(getRollupCount("cat-men")).toBe(16);
      // Shirts total = 3 (shirts) + 5 (formal shirts) = 8
      expect(getRollupCount("cat-shirts")).toBe(8);
      // Women's Collection total = 12 (saree)
      expect(getRollupCount("cat-women")).toBe(12);
    });

    it("should match inventory products by category name in search", () => {
      const query = "panjabi";
      const results = mockInventoryProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Royal Silk Panjabi");
    });

    it("should correctly group inventory products by category", () => {
      const groups: Record<string, typeof mockInventoryProducts> = {};
      for (const item of mockInventoryProducts) {
        const key = item.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      const keys = Object.keys(groups);
      expect(keys).toContain("Formal Shirts");
      expect(keys).toContain("Panjabi");
      expect(keys).toContain("Shirts");
      expect(keys).toContain("Saree");
      expect(groups["Formal Shirts"]).toHaveLength(1);
    });
  });
});

