import { describe, it, expect } from "vitest";
import {
  DEFAULT_CURATED_CATEGORIES,
  CuratedCategoriesSettings,
  CuratedCategorySlot,
} from "@/types/curated-categories.types";

describe("Curated Categories Configuration & Types", () => {
  it("should have valid default curated categories configuration", () => {
    expect(DEFAULT_CURATED_CATEGORIES.isEnabled).toBe(true);
    expect(DEFAULT_CURATED_CATEGORIES.badge).toBe("The Style Edit");
    expect(DEFAULT_CURATED_CATEGORIES.title).toBe("Curated Categories");
    expect(DEFAULT_CURATED_CATEGORIES.slots).toHaveLength(4);

    expect(DEFAULT_CURATED_CATEGORIES.slots[0].subtitle).toBe("Classic & Contemporary");
    expect(DEFAULT_CURATED_CATEGORIES.slots[1].subtitle).toBe("Signature Collection");
    expect(DEFAULT_CURATED_CATEGORIES.slots[2].subtitle).toBe("Shop Now");
    expect(DEFAULT_CURATED_CATEGORIES.slots[3].subtitle).toBe("Shop Now");
  });

  it("should support custom category slot overrides", () => {
    const customSlot: CuratedCategorySlot = {
      id: "slot-1",
      categoryId: "cat-123",
      subtitle: "Exclusive Summer 2026",
      customTitle: "Luxury Panjabi",
      customImageUrl: "https://example.com/banner.jpg",
    };

    expect(customSlot.categoryId).toBe("cat-123");
    expect(customSlot.subtitle).toBe("Exclusive Summer 2026");
    expect(customSlot.customTitle).toBe("Luxury Panjabi");
    expect(customSlot.customImageUrl).toBe("https://example.com/banner.jpg");
  });

  it("should support toggling section visibility", () => {
    const settings: CuratedCategoriesSettings = {
      ...DEFAULT_CURATED_CATEGORIES,
      isEnabled: false,
    };

    expect(settings.isEnabled).toBe(false);
  });
});
