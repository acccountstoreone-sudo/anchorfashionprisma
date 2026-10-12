"use server";

import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin-client";
import { verifySuperAdmin } from "../security/roles";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

export type StoreInfo = {
  store_name: string;
  store_description: string;
  phone: string;
  email: string;
  address: string;
  announcement_bar: string;
  free_shipping_threshold: string;
};

export type SocialLinks = {
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  tiktok: string;
};

export type StoreConfig = {
  store_name: string;
  currency: string;
  timezone: string;
  weight_unit: string;
};

export type SeoSettings = {
  meta_title: string;
  meta_description: string;
  social_image: string;
  keywords?: string;
};

export type SecuritySettingsConfig = {
  two_factor_required: boolean;
  strict_password_policy: boolean;
  auto_session_timeout: boolean;
};

export type EmailSettingsConfig = {
  sender_name: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: string;
};

export type AnalyticsSettingsConfig = {
  ga_id: string;
  gtm_id: string;
  fb_pixel: string;
};

const DEFAULTS: {
  store_info: StoreInfo;
  social_links: SocialLinks;
  store_config: StoreConfig;
  seo_settings: SeoSettings;
  security_settings: SecuritySettingsConfig;
  email_settings: EmailSettingsConfig;
  analytics_settings: AnalyticsSettingsConfig;
} = {
  store_info: {
    store_name: "Anchor Fashion Enterprise",
    store_description:
      "Premium apparel for the modern professional. Elevate your wardrobe with our carefully curated collections.",
    phone: "+880 1711-223344",
    email: "support@anchorfashion.com",
    address: "Dhaka, Bangladesh",
    announcement_bar:
      "🚚 Free Shipping On Orders Over ৳999 | Easy Returns & Exchanges",
    free_shipping_threshold: "999",
  },
  social_links: {
    facebook: "#",
    instagram: "#",
    twitter: "#",
    youtube: "#",
    tiktok: "#",
  },
  store_config: {
    store_name: "Anchor Fashion",
    currency: "BDT (৳)",
    timezone: "Asia/Dhaka (GMT+6)",
    weight_unit: "kg",
  },
  seo_settings: {
    meta_title: "Anchor Fashion | Premium Clothing Brand",
    meta_description:
      "Discover the latest trends in fashion at Anchor Fashion. Shop premium clothing and accessories.",
    social_image: "https://anchorfashion.com/og-image.jpg",
    keywords: "fashion, clothing, anchor fashion, bangladesh, apparel",
  },
  security_settings: {
    two_factor_required: false,
    strict_password_policy: true,
    auto_session_timeout: true,
  },
  email_settings: {
    sender_name: "Anchor Fashion Support",
    sender_email: "noreply@anchorfashion.com",
    smtp_host: "smtp.mailgun.org",
    smtp_port: "587",
  },
  analytics_settings: {
    ga_id: "",
    gtm_id: "",
    fb_pixel: "",
  },
};

const getCachedSetting = unstable_cache(
  async (key: string, defaultValue: any): Promise<any> => {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .single();
      if (data?.value && typeof data.value === "object") {
        return { ...defaultValue, ...(data.value as any) };
      }
      return (data?.value as any) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  },
  ["global-settings-cache"],
  { tags: ["settings"], revalidate: 300 }
);

export async function getStoreInfo(): Promise<StoreInfo> {
  return getCachedSetting("store_info", DEFAULTS.store_info);
}

export async function getSocialLinks(): Promise<SocialLinks> {
  return getCachedSetting("social_links", DEFAULTS.social_links);
}

export async function updateStoreInfo(info: StoreInfo) {
  try {
    await verifySuperAdmin(); // Enforce strict role-based access
    const supabase = createAdminClient(); // Bypass RLS securely for writing settings

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "store_info",
          value: info as any,
          description: "Global store contact and branding info",
        },
        { onConflict: "key" }
      );
      
    if (error) throw error;
    
    try {
      revalidateTag("settings");
      revalidatePath("/", "layout");
    } catch {}
    return { success: true };
  } catch (error: any) {
    console.error("[updateStoreInfo]", error);
    return { success: false, error: error.message };
  }
}

export async function updateSocialLinks(links: SocialLinks) {
  try {
    await verifySuperAdmin(); // Enforce strict role-based access
    const supabase = createAdminClient(); // Bypass RLS securely for writing settings

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "social_links",
          value: links as any,
          description: "Store social media profile URLs",
        },
        { onConflict: "key" }
      );
      
    if (error) throw error;
    
    try {
      revalidateTag("settings");
      revalidatePath("/", "layout");
    } catch {}
    return { success: true };
  } catch (error: any) {
    console.error("[updateSocialLinks]", error);
    return { success: false, error: error.message };
  }
}

export async function getStoreConfig(): Promise<StoreConfig> {
  return getCachedSetting("store_config", DEFAULTS.store_config);
}

export async function updateStoreConfig(config: StoreConfig) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "store_config",
          value: config as any,
          description: "Global store configuration",
        },
        { onConflict: "key" }
      );
      
    if (error) throw error;
    
    try {
      revalidateTag("settings");
      revalidatePath("/admin/settings/store");
      revalidatePath("/", "layout");
    } catch {}
    return { success: true };
  } catch (error: any) {
    console.error("[updateStoreConfig]", error);
    return { success: false, error: error.message };
  }
}

export async function getSeoSettings(): Promise<SeoSettings> {
  return getCachedSetting("seo_settings", DEFAULTS.seo_settings);
}

export async function updateSeoSettings(settings: SeoSettings) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "seo_settings",
          value: settings as any,
          description: "Default SEO and Meta tag configuration",
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    try {
      revalidateTag("settings");
      revalidatePath("/", "layout");
      revalidatePath("/admin/settings/seo");
    } catch {}
    return { success: true };
  } catch (error: any) {
    console.error("[updateSeoSettings]", error);
    return { success: false, error: error.message };
  }
}

export async function getSecuritySettings(): Promise<SecuritySettingsConfig> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "security_settings")
      .single();
    return (data?.value as SecuritySettingsConfig) ?? DEFAULTS.security_settings;
  } catch {
    return DEFAULTS.security_settings;
  }
}

export async function updateSecuritySettings(config: SecuritySettingsConfig) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "security_settings",
          value: config as any,
          description: "Security and authentication policies",
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    revalidatePath("/admin/settings/security");
    return { success: true };
  } catch (error: any) {
    console.error("[updateSecuritySettings]", error);
    return { success: false, error: error.message };
  }
}

export async function getEmailSettings(): Promise<EmailSettingsConfig> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "email_settings")
      .single();
    return (data?.value as EmailSettingsConfig) ?? DEFAULTS.email_settings;
  } catch {
    return DEFAULTS.email_settings;
  }
}

export async function updateEmailSettings(config: EmailSettingsConfig) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "email_settings",
          value: config as any,
          description: "Outgoing email SMTP configuration",
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    revalidatePath("/admin/settings/email");
    return { success: true };
  } catch (error: any) {
    console.error("[updateEmailSettings]", error);
    return { success: false, error: error.message };
  }
}

export async function getAnalyticsSettings(): Promise<AnalyticsSettingsConfig> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "analytics_settings")
      .single();
    return (data?.value as AnalyticsSettingsConfig) ?? DEFAULTS.analytics_settings;
  } catch {
    return DEFAULTS.analytics_settings;
  }
}

export async function updateAnalyticsSettings(config: AnalyticsSettingsConfig) {
  try {
    await verifySuperAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "analytics_settings",
          value: config as any,
          description: "Third-party analytics and tracking IDs",
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    revalidatePath("/admin/settings/analytics");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("[updateAnalyticsSettings]", error);
    return { success: false, error: error.message };
  }
}
