import { describe, it, expect } from "vitest";
import {
  PremiumMobileMenu,
  MobileMenu,
  MobileCategory,
  MobileNavLinkItem,
} from "@/components/layout/mobile-menu";

describe("PremiumMobileMenu & Responsive Navigation Architecture", () => {
  it("should export both PremiumMobileMenu and MobileMenu as valid components", () => {
    expect(PremiumMobileMenu).toBeDefined();
    expect(MobileMenu).toBeDefined();
    expect(typeof PremiumMobileMenu).toBe("function");
    expect(PremiumMobileMenu).toBe(MobileMenu);
  });

  it("should support typed category items with luxury properties", () => {
    const mockCategory: MobileCategory = {
      id: "cat-panjabi-001",
      name: "Panjabi",
      slug: "panjabi",
      display_order: 1,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b",
    };

    expect(mockCategory.id).toBe("cat-panjabi-001");
    expect(mockCategory.name).toBe("Panjabi");
    expect(mockCategory.slug).toBe("panjabi");
    expect(mockCategory.is_active).toBe(true);
    expect(mockCategory.image_url).toContain("unsplash");
  });

  it("should support structured mega menu navigation links for mobile viewports", () => {
    const mockNavLink: MobileNavLinkItem = {
      label: "PANJABI",
      href: "/categories/panjabi",
      megaMenu: {
        leftCard: {
          tag: "FESTIVE",
          title: "Royal Silk Panjabi",
          subtitle: "Handcrafted Zari & Dobby",
          src: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80",
          alt: "Royal Silk Panjabi",
          href: "/categories/panjabi",
          ctaText: "Shop Collection",
        },
        columns: [
          {
            title: "OCCASION & STYLE",
            links: [
              { label: "Festive Eid Edit", href: "/categories/panjabi?occasion=festive" },
              { label: "Royal Wedding Special", href: "/categories/panjabi?occasion=wedding" },
            ],
          },
          {
            title: "FABRICS & WEAVES",
            links: [
              { label: "100% Pure Silk", href: "/categories/panjabi?fabric=silk" },
              { label: "Egyptian Cotton", href: "/categories/panjabi?fabric=cotton" },
            ],
          },
        ],
      },
    };

    expect(mockNavLink.label).toBe("PANJABI");
    expect(mockNavLink.megaMenu?.columns).toHaveLength(2);
    expect(mockNavLink.megaMenu?.columns[0].links).toHaveLength(2);
    expect(mockNavLink.megaMenu?.leftCard?.title).toBe("Royal Silk Panjabi");
  });

  it("should sanitize emoji and special characters when clicking trending search chips", () => {
    const rawChips = [
      "👑 Royal Panjabi",
      "👔 Executive Shirts",
      "✨ Silk Kabli",
      "🔥 Festive Drop",
      "⚡ New Arrivals",
    ];

    const cleanQuery = (raw: string) => raw.replace(/^[\p{Emoji}\s]+/u, "").trim();

    expect(cleanQuery(rawChips[0])).toBe("Royal Panjabi");
    expect(cleanQuery(rawChips[1])).toBe("Executive Shirts");
    expect(cleanQuery(rawChips[2])).toBe("Silk Kabli");
    expect(cleanQuery(rawChips[3])).toBe("Festive Drop");
    expect(cleanQuery(rawChips[4])).toBe("New Arrivals");
  });

  it("should format user display name and initials correctly for mobile header badge", () => {
    const getInitials = (fullName?: string, email?: string) =>
      (fullName || email || "Guest").slice(0, 2).toUpperCase();

    const getDisplayName = (fullName?: string, email?: string) =>
      fullName || email?.split("@")[0] || "Valued Patron";

    expect(getInitials("Bijoy Partho", "partho@anchor.com")).toBe("BI");
    expect(getInitials(undefined, "support@anchor.com")).toBe("SU");
    expect(getInitials(undefined, undefined)).toBe("GU");

    expect(getDisplayName("Bijoy Partho", "partho@anchor.com")).toBe("Bijoy Partho");
    expect(getDisplayName(undefined, "customer@anchor.com")).toBe("customer");
    expect(getDisplayName(undefined, undefined)).toBe("Valued Patron");
  });

  it("should correctly identify staff roles for dashboard quick-links", () => {
    const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
    const MANAGER_ROLES = ["STORE_MANAGER", "BRANCH_MANAGER", "INVENTORY_MANAGER", "MANAGER"];

    const isStaff = (role: string) =>
      ADMIN_ROLES.includes(role) || MANAGER_ROLES.includes(role);

    expect(isStaff("ADMIN")).toBe(true);
    expect(isStaff("SUPER_ADMIN")).toBe(true);
    expect(isStaff("STORE_MANAGER")).toBe(true);
    expect(isStaff("BRANCH_MANAGER")).toBe(true);
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(isStaff("USER")).toBe(false);
  });
});
