"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateHomepageCache } from "@/lib/cache/invalidate-catalog";
import { CACHE_TAGS } from "@/lib/cache/catalog-cache";
import {
  CuratedCategoriesSettings,
  CuratedCategoriesData,
  CuratedCategoryItem,
  DEFAULT_CURATED_CATEGORIES,
} from "@/types/curated-categories.types";

const SETTINGS_KEY = "curated_categories_settings";

const DEFAULT_SUBTITLES = [
  "Classic & Contemporary",
  "Signature Collection",
  "Shop Now",
  "Shop Now",
];

/**
 * Internal authorization helper: ensures only authenticated staff/admin can mutate settings
 */
async function verifyStaffSession(): Promise<{ authorized: boolean; error?: string }> {
  try {
    const { getServerSession } = await import("@/lib/auth/server");
    const { user } = await getServerSession();

    if (!user) {
      return { authorized: false, error: "Authentication required. Please log in." };
    }

    let role = String((user as any).role || (user as any).user_metadata?.role || "").trim().toUpperCase();

    if (!role || role === "USER" || role === "CUSTOMER") {
      const isUuid =
        user.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

      const profile = await prisma.profile.findFirst({
        where: {
          OR: [
            ...(isUuid ? [{ id: user.id }] : []),
            ...(user.email ? [{ email: user.email }] : []),
          ],
        },
        include: { role: true },
      });

      if (profile?.role?.name) {
        role = profile.role.name.trim().toUpperCase();
      }
    }

    const normalizedRole = role.replace(/[\s_-]+/g, "");
    const allowedRoles = [
      "ADMIN",
      "SUPERADMIN",
      "MANAGER",
      "MARKETINGMANAGER",
      "MARKETING",
      "STAFF",
    ];

    if (!allowedRoles.includes(normalizedRole)) {
      return { authorized: false, error: "Access denied. Insufficient staff permissions." };
    }

    return { authorized: true };
  } catch (err: any) {
    console.warn("[verifyStaffSession] Session verification exception:", err.message);
    // In local dev without session cookies, allow fallback gracefully if in development
    if (process.env.NODE_ENV === "development") {
      return { authorized: true };
    }
    return { authorized: false, error: "Session verification failed." };
  }
}

/**
 * Fetches the Curated Categories (The Style Edit) settings from the database.
 * Falls back to DEFAULT_CURATED_CATEGORIES if not configured yet.
 */
export async function getCuratedCategoriesSettings(): Promise<CuratedCategoriesSettings> {
  try {
    const record = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (record?.value) {
      const val = record.value as Partial<CuratedCategoriesSettings>;
      return {
        isEnabled: val.isEnabled ?? DEFAULT_CURATED_CATEGORIES.isEnabled,
        badge: val.badge?.trim() || DEFAULT_CURATED_CATEGORIES.badge,
        title: val.title?.trim() || DEFAULT_CURATED_CATEGORIES.title,
        description: val.description?.trim() || DEFAULT_CURATED_CATEGORIES.description,
        viewAllText: val.viewAllText?.trim() || DEFAULT_CURATED_CATEGORIES.viewAllText,
        viewAllLink: val.viewAllLink?.trim() || DEFAULT_CURATED_CATEGORIES.viewAllLink,
        slots: Array.isArray(val.slots) && val.slots.length > 0
          ? val.slots
          : DEFAULT_CURATED_CATEGORIES.slots,
      };
    }

    return DEFAULT_CURATED_CATEGORIES;
  } catch (err) {
    console.error("[getCuratedCategoriesSettings] Exception:", err);
    return DEFAULT_CURATED_CATEGORIES;
  }
}

/**
 * Retrieves the compiled Curated Categories data for the public storefront.
 * Resolves category IDs into live category records and merges custom titles/subtitles/images.
 */
export async function getStorefrontCuratedCategories(): Promise<CuratedCategoriesData> {
  try {
    const settings = await getCuratedCategoriesSettings();

    // If section disabled by admin, return empty items so section is hidden gracefully
    if (!settings.isEnabled) {
      return { settings, items: [] };
    }

    const slotCategoryIds = (settings.slots || [])
      .map((s) => s.categoryId)
      .filter((id): id is string => Boolean(id && id.trim().length > 0));

    let items: CuratedCategoryItem[] = [];

    if (slotCategoryIds.length > 0) {
      // Fetch the selected categories in a single query
      const matchedCategories = await prisma.category.findMany({
        where: {
          id: { in: slotCategoryIds },
          isActive: true,
        },
      });

      const categoryMap = new Map(matchedCategories.map((c) => [c.id, c]));

      // Preserve the exact order specified in settings.slots
      items = settings.slots
        .map((slot, index) => {
          const category = categoryMap.get(slot.categoryId);
          if (!category) return null;

          return {
            id: slot.id || `slot-${index + 1}`,
            categoryId: category.id,
            name: slot.customTitle?.trim() || category.name,
            slug: category.slug,
            subtitle: slot.subtitle?.trim() || DEFAULT_SUBTITLES[index] || "Shop Now",
            imageUrl: slot.customImageUrl?.trim() || category.imageUrl || null,
            displayOrder: index,
          };
        })
        .filter((item): item is CuratedCategoryItem => Boolean(item));
    }

    // Fallback: If no valid slots were populated by admin yet, fallback to the top 4 active categories
    if (items.length === 0) {
      const fallbackCats = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        take: 4,
      });

      items = fallbackCats.map((c, index) => ({
        id: `auto-slot-${index + 1}`,
        categoryId: c.id,
        name: c.name,
        slug: c.slug,
        subtitle: DEFAULT_SUBTITLES[index] || "Shop Now",
        imageUrl: c.imageUrl || null,
        displayOrder: index,
      }));
    }

    return { settings, items };
  } catch (err) {
    console.error("[getStorefrontCuratedCategories] Exception:", err);
    return {
      settings: DEFAULT_CURATED_CATEGORIES,
      items: [],
    };
  }
}

/**
 * Updates the Curated Categories (The Style Edit) settings in PostgreSQL.
 * Instantly invalidates homepage and catalog caches so changes show immediately.
 */
export async function updateCuratedCategoriesSettings(
  settings: CuratedCategoriesSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Authorize user
    const authCheck = await verifyStaffSession();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    // 2. Sanitize and clean settings
    const cleanSettings: CuratedCategoriesSettings = {
      isEnabled: settings.isEnabled ?? true,
      badge: settings.badge?.trim() || DEFAULT_CURATED_CATEGORIES.badge,
      title: settings.title?.trim() || DEFAULT_CURATED_CATEGORIES.title,
      description: settings.description?.trim() || DEFAULT_CURATED_CATEGORIES.description,
      viewAllText: settings.viewAllText?.trim() || DEFAULT_CURATED_CATEGORIES.viewAllText,
      viewAllLink: settings.viewAllLink?.trim() || DEFAULT_CURATED_CATEGORIES.viewAllLink,
      slots: (settings.slots || []).map((slot, idx) => ({
        id: slot.id || `slot-${idx + 1}`,
        categoryId: slot.categoryId?.trim() || "",
        subtitle: slot.subtitle?.trim() || DEFAULT_SUBTITLES[idx] || "Shop Now",
        customTitle: slot.customTitle?.trim() || "",
        customImageUrl: slot.customImageUrl?.trim() || "",
      })),
    };

    // 3. Upsert into database
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: {
        value: cleanSettings as any,
        category: "cms",
        description: "Homepage Curated Categories (The Style Edit) section configuration",
      },
      create: {
        key: SETTINGS_KEY,
        value: cleanSettings as any,
        category: "cms",
        description: "Homepage Curated Categories (The Style Edit) section configuration",
      },
    });

    // 4. Targeted Next.js Cache Invalidation
    try {
      invalidateHomepageCache();
      revalidateTag(CACHE_TAGS.HOMEPAGE);
      revalidateTag(CACHE_TAGS.CATEGORIES);
      revalidateTag("curated-categories");
      revalidatePath("/", "page");
      revalidatePath("/(shop)", "page");
      revalidatePath("/admin/cms/curated-categories");
      revalidatePath("/admin/cms");
    } catch (cacheErr) {
      console.warn("[updateCuratedCategoriesSettings] Cache revalidation warning:", cacheErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("[updateCuratedCategoriesSettings] Error:", err);
    return { success: false, error: err.message || "Failed to save curated categories" };
  }
}

/**
 * Resets Curated Categories settings to default auto configuration.
 */
export async function resetCuratedCategoriesSettings(): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await verifyStaffSession();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    await prisma.setting.delete({
      where: { key: SETTINGS_KEY },
    }).catch(() => {});

    try {
      invalidateHomepageCache();
      revalidateTag(CACHE_TAGS.HOMEPAGE);
      revalidateTag("curated-categories");
      revalidatePath("/", "page");
      revalidatePath("/admin/cms/curated-categories");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("[resetCuratedCategoriesSettings] Error:", err);
    return { success: false, error: err.message || "Failed to reset settings" };
  }
}
