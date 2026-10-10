"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateHomepageCache } from "@/lib/cache/invalidate-catalog";
import { CACHE_TAGS } from "@/lib/cache/catalog-cache";
import {
  WhyChooseUsSettings,
  DEFAULT_WHY_CHOOSE_US,
} from "@/types/why-choose-us.types";

const SETTINGS_KEY = "why_choose_us_settings";

/**
 * Fetches the Why Choose Us / Brand Ethos settings from Supabase.
 * Uses createAdminClient to remain static/cache-safe (no cookies).
 * Falls back to DEFAULT_WHY_CHOOSE_US if not yet stored or on error.
 */
export async function getWhyChooseUsSettings(): Promise<WhyChooseUsSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      console.warn("[getWhyChooseUsSettings] Error fetching settings, using defaults:", error.message);
      return DEFAULT_WHY_CHOOSE_US;
    }

    if (data?.value) {
      const val = data.value as Partial<WhyChooseUsSettings>;
      return {
        isEnabled: val.isEnabled ?? DEFAULT_WHY_CHOOSE_US.isEnabled,
        badge: val.badge || DEFAULT_WHY_CHOOSE_US.badge,
        title: val.title || DEFAULT_WHY_CHOOSE_US.title,
        description: val.description || DEFAULT_WHY_CHOOSE_US.description,
        imageUrl: val.imageUrl || DEFAULT_WHY_CHOOSE_US.imageUrl,
        benefits:
          Array.isArray(val.benefits) && val.benefits.length > 0
            ? val.benefits
            : DEFAULT_WHY_CHOOSE_US.benefits,
      };
    }

    return DEFAULT_WHY_CHOOSE_US;
  } catch (err: any) {
    console.error("[getWhyChooseUsSettings] Exception:", err);
    return DEFAULT_WHY_CHOOSE_US;
  }
}

/**
 * Updates the Why Choose Us / Brand Ethos settings in Supabase.
 * Revalidates homepage cache immediately.
 */
export async function updateWhyChooseUsSettings(
  settings: WhyChooseUsSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const cleanSettings: WhyChooseUsSettings = {
      isEnabled: settings.isEnabled ?? true,
      badge: settings.badge?.trim() || DEFAULT_WHY_CHOOSE_US.badge,
      title: settings.title?.trim() || DEFAULT_WHY_CHOOSE_US.title,
      description: settings.description?.trim() || DEFAULT_WHY_CHOOSE_US.description,
      imageUrl: settings.imageUrl?.trim() || DEFAULT_WHY_CHOOSE_US.imageUrl,
      benefits: (settings.benefits || []).map((b, idx) => ({
        id: b.id || `benefit-${idx + 1}`,
        icon: b.icon || "ShieldCheck",
        title: b.title?.trim() || `Benefit ${idx + 1}`,
        description: b.description?.trim() || "",
      })),
    };

    const { error } = await supabase.from("settings").upsert(
      {
        key: SETTINGS_KEY,
        value: cleanSettings as any,
        description: "Homepage Why Choose Us & Brand Ethos section settings",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      console.error("[updateWhyChooseUsSettings] Upsert error:", error);
      throw error;
    }

    // Instantly invalidate public homepage and catalog caches
    invalidateHomepageCache();
    try {
      revalidateTag(CACHE_TAGS.HOMEPAGE, "max");
      revalidateTag(CACHE_TAGS.CATALOG, "max");
      revalidateTag("homepage-why-choose-us", "max");
    } catch {}
    revalidatePath("/", "page");
    revalidatePath("/", "layout");
    revalidatePath("/(shop)", "page");
    revalidatePath("/(shop)", "layout");
    revalidatePath("/admin/cms/why-choose-us");
    revalidatePath("/manager/cms/why-choose-us");

    return { success: true };
  } catch (err: any) {
    console.error("[updateWhyChooseUsSettings] Failed:", err);
    return { success: false, error: err.message || "Failed to update settings" };
  }
}

/**
 * Resets Why Choose Us / Brand Ethos to original defaults.
 */
export async function resetWhyChooseUsSettings(): Promise<{
  success: boolean;
  data: WhyChooseUsSettings;
  error?: string;
}> {
  try {
    const res = await updateWhyChooseUsSettings(DEFAULT_WHY_CHOOSE_US);
    if (!res.success) {
      return { success: false, data: DEFAULT_WHY_CHOOSE_US, error: res.error };
    }
    return { success: true, data: DEFAULT_WHY_CHOOSE_US };
  } catch (err: any) {
    return { success: false, data: DEFAULT_WHY_CHOOSE_US, error: err.message };
  }
}
