"use server";

import { cmsService } from "@/services/cms.service";
import { CMSPage, CMSSection, CMSNavigation, CMSPageBlock, CMSMediaItem } from "@/types/cms.types";
import { revalidatePath } from "next/cache";
import { invalidateHomepageCache } from "@/lib/cache/invalidate-catalog";

export async function getPages(): Promise<CMSPage[]> {
  return await cmsService.getPages();
}

export async function getPageById(id: string): Promise<CMSPage | null> {
  return await cmsService.getPageById(id);
}

export async function getPageBySlug(slug: string): Promise<CMSPage | null> {
  return await cmsService.getPageBySlug(slug);
}

export async function createPage(data: unknown): Promise<CMSPage> {
  const page = await cmsService.createPage(data);
  revalidatePath("/admin/cms");
  return page;
}

export async function updatePage(id: string, data: unknown): Promise<CMSPage> {
  const page = await cmsService.updatePage(id, data);
  revalidatePath("/admin/cms");
  if (page.slug) {
    revalidatePath(`/${page.slug}`);
  }
  return page;
}

export async function deletePage(id: string): Promise<void> {
  await cmsService.deletePage(id);
  revalidatePath("/admin/cms");
}

export async function getPageBlocks(pageId: string): Promise<CMSPageBlock[]> {
  return await cmsService.getPageBlocks(pageId);
}

export async function savePageBlocks(pageId: string, blocks: Partial<CMSPageBlock>[]): Promise<void> {
  await cmsService.savePageBlocks(pageId, blocks);
  revalidatePath("/admin/cms");
  // Might want to revalidate the exact public page here if we know the slug
}

export async function getGlobalSections(): Promise<CMSSection[]> {
  return await cmsService.getGlobalSections();
}

export async function getNavigation(
  location: string
): Promise<CMSNavigation | null> {
  return await cmsService.getNavigation(location);
}

export async function getAllNavigations(): Promise<CMSNavigation[]> {
  return await cmsService.getAllNavigations();
}

export async function saveNavigation(
  location: string,
  name: string,
  items: any[]
): Promise<CMSNavigation> {
  try {
    const nav = await cmsService.saveNavigation(location, name, items);
    return nav;
  } catch (err: any) {
    console.error("Error in saveNavigation:", err);
    throw new Error(err.message || "Failed to save navigation");
  }
}

export async function deleteNavigation(id: string): Promise<void> {
  try {
    await cmsService.deleteNavigation(id);
  } catch (err: any) {
    console.error("Error in deleteNavigation:", err);
    throw new Error(err.message || "Failed to delete navigation");
  }
}

// Media
export async function getMedia(): Promise<CMSMediaItem[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cms_media")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error in getMedia:", error.message);
      return [];
    }
    return (data || []) as CMSMediaItem[];
  } catch (err) {
    console.error("Failed to fetch media:", err);
    return [];
  }
}

export async function uploadMedia(formData: FormData) {
  const fileEntries = formData.getAll("files").concat(formData.getAll("file")) as File[];
  const validFiles = fileEntries.filter(
    (f): f is File => f && typeof f !== "string" && typeof f.size === "number" && f.size > 0
  );

  if (validFiles.length === 0) {
    throw new Error("No valid files uploaded");
  }

  const { createAdminClient } = await import("@/lib/supabase/admin-client");
  const { createClient } = await import("@/lib/supabase/server");
  const adminSupabase = createAdminClient();

  // Safely get logged-in user without breaking if session is absent
  let userId: string | null = null;
  try {
    const userClient = await createClient();
    const { data } = await userClient.auth.getUser();
    userId = data?.user?.id || null;
  } catch {
    userId = null;
  }

  const uploadedRecords: CMSMediaItem[] = [];

  for (const file of validFiles) {
    const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const sanitizedBase = file.name
      .substring(0, file.name.lastIndexOf(".") > 0 ? file.name.lastIndexOf(".") : file.name.length)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 30);
    const fileName = `${Date.now()}_${sanitizedBase}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = fileName;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from("media")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from("media")
      .getPublicUrl(filePath);

    const { data: dbData, error: dbError } = await adminSupabase
      .from("cms_media")
      .insert({
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        file_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      throw new Error(`Database record creation failed for ${file.name}: ${dbError.message}`);
    }

    uploadedRecords.push(dbData as CMSMediaItem);
  }

  revalidatePath("/admin/cms/media");
  return { success: true, count: uploadedRecords.length, data: uploadedRecords };
}

export async function deleteMedia(id: string, fileUrl?: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();

    // Remove from storage bucket if fileUrl is provided
    if (fileUrl) {
      try {
        const url = new URL(fileUrl);
        const match = url.pathname.match(/\/media\/(.+)$/);
        if (match && match[1]) {
          const storagePath = decodeURIComponent(match[1]);
          await supabase.storage.from("media").remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn("Storage removal non-fatal error:", storageErr);
      }
    }

    const { error } = await supabase.from("cms_media").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/cms/media");
    return { success: true };
  } catch (err: any) {
    console.error("Delete media error:", err);
    return { success: false, error: err.message };
  }
}

export async function seedSampleMedia() {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();

    const sampleAssets = [
      {
        file_name: "hero-summer-collection.jpg",
        file_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
        file_type: "image/jpeg",
        file_size_bytes: 1845200,
        alt_text: "Summer Luxury Fashion Collection",
      },
      {
        file_name: "fashion-autumn-coat.jpg",
        file_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop",
        file_type: "image/jpeg",
        file_size_bytes: 2154000,
        alt_text: "Autumn Winter Designer Overcoat",
      },
      {
        file_name: "lookbook-streetwear-hoodie.jpg",
        file_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1200&auto=format&fit=crop",
        file_type: "image/jpeg",
        file_size_bytes: 1420300,
        alt_text: "Urban Streetwear Premium Hoodie",
      },
      {
        file_name: "accessories-luxury-handbag.jpg",
        file_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop",
        file_type: "image/jpeg",
        file_size_bytes: 980400,
        alt_text: "Italian Leather Luxury Handbag",
      },
      {
        file_name: "footwear-minimalist-sneaker.jpg",
        file_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop",
        file_type: "image/jpeg",
        file_size_bytes: 1120000,
        alt_text: "Minimalist Leather Craft Sneaker",
      },
      {
        file_name: "brand-lookbook-2026.pdf",
        file_url: "https://example.com/assets/lookbook-2026.pdf",
        file_type: "application/pdf",
        file_size_bytes: 4500000,
        alt_text: "Anchor Fashion Official Lookbook 2026",
      },
    ];

    const { data, error } = await supabase
      .from("cms_media")
      .insert(sampleAssets)
      .select();

    if (error) throw new Error(error.message);

    revalidatePath("/admin/cms/media");
    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    console.error("Failed to seed sample media:", err);
    return { success: false, error: err.message };
  }
}


// Banners
export async function getBanners() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cms_banners")
    .select("*")
    .order("created_at", { ascending: false });
  if (error && error.code !== "42P01") throw new Error(error.message);
  return data || [];
}

// SEO
export async function getSeoSettings() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cms_seo_redirects")
    .select("*")
    .limit(10);
  if (error && error.code !== "42P01") throw new Error(error.message);
  return data || [];
}

export type HeroSlide = {
  id: string | number;
  image_url?: string | null;
  media_url?: string | null;
  image?: string | null;
  link_url?: string | null;
  cta_url?: string | null;
  ctaHref?: string | null;
  display_order?: number;
  title?: string | null;
  headline?: string | null;
  subtitle?: string | null;
  subheadline?: string | null;
  description?: string | null;
  cta_text?: string | null;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  placement?: "hero" | "promo";
  isVideo?: boolean;
};

export type FeaturedPromoBannerData = {
  id?: string;
  title: string;
  subtitle: string;
  description?: string | null;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
};

const DEFAULT_PROMO_BANNER: FeaturedPromoBannerData = {
  title: "Mid-Season Sale Up To 50% Off",
  subtitle: "Limited Time Offer",
  description:
    "Elevate your wardrobe with our latest curated collection. Exclusive pieces designed for the modern individual who values both aesthetics and comfort.",
  ctaText: "Shop The Sale",
  ctaLink: "/categories/sale",
  imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=80",
};

export type PromoBanner = {
  id: string;
  title: string | null;
  description: string | null;
  image_desktop: string;
  cta_text: string | null;
  cta_url: string | null;
  bg_color: string | null;
};

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "default-1",
    image_url: "/images/home/hero-banner.png",
    media_url: "/images/home/hero-banner.png",
    image: "/images/home/hero-banner.png",
    link_url: "/products?sort=newest",
    cta_url: "/products?sort=newest",
    ctaHref: "/products?sort=newest",
    display_order: 0,
    title: "Summer Collection",
    headline: "Summer Collection",
    subtitle: "New Arrivals",
    subheadline: "New Arrivals",
    cta_text: "Shop Now",
    is_active: true,
    placement: "hero",
  },
  {
    id: "default-2",
    image_url: "/images/home/hero-slide-2.png",
    media_url: "/images/home/hero-slide-2.png",
    image: "/images/home/hero-slide-2.png",
    link_url: "/categories/ethnic",
    cta_url: "/categories/ethnic",
    ctaHref: "/categories/ethnic",
    display_order: 1,
    title: "Ethnic Wear",
    headline: "Ethnic Wear",
    subtitle: "Crafted for Elegance",
    subheadline: "Crafted for Elegance",
    cta_text: "Shop Now",
    is_active: true,
    placement: "hero",
  },
  {
    id: "default-3",
    image_url: "/images/home/hero-slide-3.png",
    media_url: "/images/home/hero-slide-3.png",
    image: "/images/home/hero-slide-3.png",
    link_url: "/categories/summer",
    cta_url: "/categories/summer",
    ctaHref: "/categories/summer",
    display_order: 2,
    title: "Seasonal Essentials",
    headline: "Seasonal Essentials",
    subtitle: "Up to 40% Off",
    subheadline: "Up to 40% Off",
    cta_text: "Shop Now",
    is_active: true,
    placement: "hero",
  },
  {
    id: "default-promo-1",
    image_url: DEFAULT_PROMO_BANNER.imageUrl,
    media_url: DEFAULT_PROMO_BANNER.imageUrl,
    image: DEFAULT_PROMO_BANNER.imageUrl,
    link_url: DEFAULT_PROMO_BANNER.ctaLink,
    cta_url: DEFAULT_PROMO_BANNER.ctaLink,
    ctaHref: DEFAULT_PROMO_BANNER.ctaLink,
    display_order: 1,
    title: DEFAULT_PROMO_BANNER.title,
    headline: DEFAULT_PROMO_BANNER.title,
    subtitle: DEFAULT_PROMO_BANNER.subtitle,
    subheadline: DEFAULT_PROMO_BANNER.subtitle,
    description: DEFAULT_PROMO_BANNER.description ?? null,
    cta_text: DEFAULT_PROMO_BANNER.ctaText,
    is_active: true,
    placement: "promo",
  },
];

function isBannerActive(b: any, now: Date): boolean {
  if (b.status && b.status !== "active") return false;
  // If dates are inverted (start date after end date), do not block if banner is marked active
  if (b.start_date && b.end_date) {
    const s = new Date(b.start_date).getTime();
    const e = new Date(b.end_date).getTime();
    if (s > e) return true;
  }
  if (b.start_date) {
    const startDate = new Date(b.start_date);
    if (startDate.getTime() > now.getTime()) return false;
  }
  if (b.end_date) {
    const endDate = new Date(b.end_date);
    if (endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0 && endDate.getUTCSeconds() === 0) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
    if (endDate.getTime() < now.getTime()) return false;
  }
  return true;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();
    const now = new Date();
    const { data: banners, error } = await supabase
      .from("cms_banners")
      .select("*")
      .in("type", ["hero", "sidebar"])
      .order("created_at", { ascending: true });

    if (error || !banners || banners.length === 0) return DEFAULT_SLIDES;

    const slides = (banners as any[])
      .filter((b: any) => {
        let placement = b.type === "sidebar" ? "promo" : "hero";
        if (b.content) {
          try {
            const parsed = JSON.parse(b.content);
            if (parsed.placement) placement = parsed.placement;
          } catch {}
        }
        if (placement !== "hero") return false;
        return isBannerActive(b, now);
      })
      .map((b: any, i: number) => {
        let subtitle: string | null = null;
        let cta_text = "Shop Now";
        let display_order = i;

        if (b.content) {
          try {
            const parsed = JSON.parse(b.content);
            subtitle = parsed.subtitle ?? null;
            cta_text = parsed.cta_text ?? "Shop Now";
            display_order =
              typeof parsed.display_order === "number"
                ? parsed.display_order
                : i;
          } catch {
            subtitle = b.content;
          }
        }

        const linkUrl = b.link_url || "/products";
        const title = b.title || null;
        const imageUrl = b.media_url || "/images/home/hero-banner.png";

        return {
          id: b.id,
          image_url: imageUrl,
          media_url: imageUrl,
          image: imageUrl,
          link_url: linkUrl,
          cta_url: linkUrl,
          ctaHref: linkUrl,
          display_order,
          title,
          headline: title,
          subtitle,
          subheadline: subtitle,
          cta_text,
          is_active: b.status === "active",
          start_date: b.start_date || null,
          end_date: b.end_date || null,
          placement: "hero" as const,
        };
      });

    if (slides.length === 0) return DEFAULT_SLIDES;
    return slides.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  } catch {
    return DEFAULT_SLIDES;
  }
}

export async function getFeaturedPromoBanner(): Promise<FeaturedPromoBannerData> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();
    const now = new Date();
    const { data: banners, error } = await supabase
      .from("cms_banners")
      .select("*")
      .in("type", ["sidebar", "hero"])
      .order("created_at", { ascending: false });

    if (error || !banners || banners.length === 0) {
      return DEFAULT_PROMO_BANNER;
    }

    const promoBanner = (banners as any[]).find((b: any) => {
      let placement = b.type === "sidebar" ? "promo" : "hero";
      if (b.content) {
        try {
          const parsed = JSON.parse(b.content);
          if (parsed.placement) placement = parsed.placement;
        } catch {}
      }
      return placement === "promo" && isBannerActive(b, now);
    });

    if (!promoBanner) {
      return DEFAULT_PROMO_BANNER;
    }

    let subtitle = DEFAULT_PROMO_BANNER.subtitle;
    let description = DEFAULT_PROMO_BANNER.description;
    let cta_text = DEFAULT_PROMO_BANNER.ctaText;
    if (promoBanner.content) {
      try {
        const parsed = JSON.parse(promoBanner.content);
        if (parsed.subtitle) subtitle = parsed.subtitle;
        if (parsed.description) description = parsed.description;
        if (parsed.cta_text) cta_text = parsed.cta_text;
      } catch {}
    }

    return {
      id: promoBanner.id,
      title: promoBanner.title || DEFAULT_PROMO_BANNER.title,
      subtitle: subtitle,
      description: description,
      ctaText: cta_text,
      ctaLink: promoBanner.link_url || DEFAULT_PROMO_BANNER.ctaLink,
      imageUrl: promoBanner.media_url || DEFAULT_PROMO_BANNER.imageUrl,
    };
  } catch {
    return DEFAULT_PROMO_BANNER;
  }
}

export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();
    const { data: banners, error } = await supabase
      .from("cms_banners")
      .select("*")
      .in("type", ["hero", "sidebar"])
      .order("created_at", { ascending: true });

    if (error || !banners || banners.length === 0) {
      return [];
    }

    const slides = (banners as any[]).map((b: any, i: number) => {
      let subtitle: string | null = null;
      let description: string | null = null;
      let cta_text = "Shop Now";
      let display_order = i;
      let placement: "hero" | "promo" = b.type === "sidebar" ? "promo" : "hero";

      if (b.content) {
        try {
          const parsed = JSON.parse(b.content);
          subtitle = parsed.subtitle ?? null;
          description = parsed.description ?? null;
          cta_text = parsed.cta_text ?? "Shop Now";
          if (parsed.placement === "promo" || parsed.placement === "hero") {
            placement = parsed.placement;
          }
          display_order =
            typeof parsed.display_order === "number"
              ? parsed.display_order
              : i;
        } catch {
          subtitle = b.content;
        }
      }

      const linkUrl = b.link_url || "/products";
      const title = b.title || null;
      const imageUrl = b.media_url || "/images/home/hero-banner.png";

      return {
        id: b.id,
        image_url: imageUrl,
        media_url: imageUrl,
        image: imageUrl,
        link_url: linkUrl,
        cta_url: linkUrl,
        ctaHref: linkUrl,
        display_order,
        title,
        headline: title,
        subtitle,
        subheadline: subtitle,
        description,
        cta_text,
        is_active: b.status === "active",
        start_date: b.start_date || null,
        end_date: b.end_date || null,
        placement,
      };
    });

    return slides.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  } catch {
    return [];
  }
}

export async function getPromoSections(): Promise<PromoBanner[]> {
  try {
    const { getPublicSupabaseClient } = await import("@/lib/supabase/public");
    const supabase = getPublicSupabaseClient();
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("homepage_promotions")
      .select("*")
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("id");
    return (data as any[]) ?? [];
  } catch {
    return [];
  }
}

export async function upsertHeroSlide(
  slide: Partial<HeroSlide> & { image_url: string; link_url: string }
) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();

    const placement = slide.placement || "hero";
    const type = placement === "promo" ? "sidebar" : "hero";

    const contentPayload = JSON.stringify({
      subtitle: slide.subtitle || "",
      description: slide.description || "",
      cta_text: slide.cta_text || "Shop Now",
      display_order: slide.display_order ?? 0,
      placement,
    });

    const payload: Record<string, any> = {
      title: slide.title?.trim() || "Hero Banner",
      type,
      status: slide.is_active !== false ? "active" : "inactive",
      media_url: slide.image_url,
      link_url: slide.link_url || "/products",
      target_audience: "all",
      content: contentPayload,
      updated_at: new Date().toISOString(),
    };

    payload.start_date = slide.start_date && slide.start_date.trim() ? new Date(slide.start_date).toISOString() : null;
    if (slide.end_date && slide.end_date.trim()) {
      const end = new Date(slide.end_date);
      if (slide.end_date.length <= 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      payload.end_date = end.toISOString();
    } else {
      payload.end_date = null;
    }

    const isUuid =
      typeof slide.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slide.id
      );

    const { data, error } = isUuid
      ? await supabase.from("cms_banners").update(payload).eq("id", slide.id).select("id").single()
      : await supabase.from("cms_banners").insert(payload).select("id").single();

    if (error) throw error;
    invalidateHomepageCache();
    revalidatePath("/admin/cms/banners");
    revalidatePath("/");
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error("upsertHeroSlide error:", error);
    return { success: false, error: error.message };
  }
}

export async function upsertHeroSlideWithUpload(formData: FormData) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();

    const id = formData.get("id") as string | null;
    const link_url = (formData.get("link_url") as string) || "/products";
    const display_order = (formData.get("display_order") as string) || "0";
    const placement = (formData.get("placement") as string) || "hero";
    let image_url = (formData.get("image_url") as string) || "";

    const file = formData.get("file") as File | null;

    if (file && file.size > 0) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      const { error } = await supabase.storage
        .from("banners")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("banners")
        .getPublicUrl(filePath);

      image_url = publicUrlData.publicUrl;
    }

    if (!image_url) {
      throw new Error("Image is required");
    }

    const title = (formData.get("title") as string | null)?.trim() || "Hero Banner";
    const subtitle = (formData.get("subtitle") as string | null)?.trim() || "";
    const description = (formData.get("description") as string | null)?.trim() || "";
    const cta_text = (formData.get("cta_text") as string | null)?.trim() || "Shop Now";
    const isActiveVal = formData.get("is_active");
    const is_active = isActiveVal === "true" || isActiveVal === "1" || isActiveVal === null;
    const start_date = formData.get("start_date") as string | null;
    const end_date = formData.get("end_date") as string | null;

    const contentPayload = JSON.stringify({
      subtitle,
      description,
      cta_text,
      display_order: parseInt(display_order, 10) || 0,
      placement,
    });

    const type = placement === "promo" ? "sidebar" : "hero";

    const payload: Record<string, any> = {
      title,
      type,
      status: is_active ? "active" : "inactive",
      media_url: image_url,
      link_url,
      target_audience: "all",
      content: contentPayload,
      updated_at: new Date().toISOString(),
    };

    payload.start_date = start_date && start_date.trim() ? new Date(start_date).toISOString() : null;
    if (end_date && end_date.trim()) {
      const end = new Date(end_date);
      if (end_date.length <= 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      payload.end_date = end.toISOString();
    } else {
      payload.end_date = null;
    }

    const isExistingUuid =
      id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    const { data, error } = isExistingUuid
      ? await supabase.from("cms_banners").update(payload).eq("id", id).select("id").single()
      : await supabase.from("cms_banners").insert(payload).select("id").single();

    if (error) throw error;
    invalidateHomepageCache();
    revalidatePath("/admin/cms/banners");
    revalidatePath("/manager/cms/banners");
    revalidatePath("/manager/cms");
    revalidatePath("/");
    return { success: true, image_url, id: data?.id };
  } catch (error: any) {
    console.error("upsertHeroSlideWithUpload error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteHeroSlide(id: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();

    // If default id, also attempt to delete by matching title
    if (id.startsWith("default-")) {
      const defaultTitles: Record<string, string> = {
        "default-1": "Summer Collection",
        "default-2": "Ethnic Wear",
        "default-3": "Seasonal Essentials",
        "default-promo-1": "Mid-Season Sale Up To 50% Off",
      };
      const title = defaultTitles[id];
      if (title) {
        await supabase.from("cms_banners").delete().eq("title", title);
      }
    }

    const { error } = await supabase
      .from("cms_banners")
      .delete()
      .eq("id", id);

    if (error && !id.startsWith("default-")) {
      throw error;
    }

    invalidateHomepageCache();
    revalidatePath("/admin/cms/banners");
    revalidatePath("/manager/cms/banners");
    revalidatePath("/manager/cms");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("deleteHeroSlide error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAllHeroSlides() {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("cms_banners")
      .delete()
      .in("type", ["hero", "sidebar"]);

    if (error) throw error;

    invalidateHomepageCache();
    revalidatePath("/admin/cms/banners");
    revalidatePath("/manager/cms/banners");
    revalidatePath("/manager/cms");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("deleteAllHeroSlides error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSeoSettings(data: any) {
  // Mock saving global SEO settings since there isn't a dedicated table structure for global SEO fields
  console.log("Saving global SEO settings", data);
  return { success: true };
}
