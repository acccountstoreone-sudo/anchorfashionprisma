"use server";

import { cmsService } from "@/services/cms.service";
import { CMSPage, CMSSection, CMSNavigation, CMSPageBlock, CMSMediaItem } from "@/types/cms.types";
import { revalidatePath } from "next/cache";
import { invalidateHomepageCache } from "@/lib/cache/invalidate-catalog";
import { CMSRepository } from "@/lib/repositories/cms.repository";

const cmsRepo = new CMSRepository();

// ============================================================================
// CMS PAGES
// ============================================================================

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
  try { revalidatePath("/admin/cms"); } catch {}
  return page;
}

export async function updatePage(id: string, data: unknown): Promise<CMSPage> {
  const page = await cmsService.updatePage(id, data);
  try {
    revalidatePath("/admin/cms");
    if ((page as any).slug) revalidatePath(`/${(page as any).slug}`);
  } catch {}
  return page;
}

export async function deletePage(id: string): Promise<void> {
  await cmsService.deletePage(id);
  try { revalidatePath("/admin/cms"); } catch {}
}

export async function getPageBlocks(pageId: string): Promise<CMSPageBlock[]> {
  return await cmsService.getPageBlocks(pageId);
}

export async function savePageBlocks(pageId: string, blocks: Partial<CMSPageBlock>[]): Promise<void> {
  await cmsService.savePageBlocks(pageId, blocks);
  try { revalidatePath("/admin/cms"); } catch {}
}

// ============================================================================
// CMS GLOBAL SECTIONS — Prisma
// ============================================================================

export async function getGlobalSections(): Promise<CMSSection[]> {
  return await cmsRepo.getGlobalSections();
}

export async function upsertGlobalSection(data: {
  id?: string;
  title: string;
  type: string;
  content?: Record<string, any>;
  isActive?: boolean;
  displayOrder?: number;
}): Promise<{ success: boolean; data?: CMSSection; error?: string }> {
  try {
    const section = await cmsRepo.upsertSection(data);
    try { revalidatePath("/admin/cms/sections"); } catch {}
    return { success: true, data: section };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteGlobalSection(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await cmsRepo.deleteSection(id);
    try { revalidatePath("/admin/cms/sections"); } catch {}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// CMS NAVIGATION — Prisma
// ============================================================================

export async function getNavigation(location: string): Promise<CMSNavigation | null> {
  return await cmsRepo.getNavigation(location);
}

export async function getAllNavigations(): Promise<CMSNavigation[]> {
  return await cmsRepo.getAllNavigations();
}

export async function saveNavigation(
  location: string,
  name: string,
  items: any[]
): Promise<CMSNavigation> {
  try {
    const nav = await cmsRepo.saveNavigation({ location, name, items });
    try {
      revalidatePath("/admin/cms/navigation");
      revalidatePath("/");
    } catch {}
    return nav;
  } catch (err: any) {
    console.error("Error in saveNavigation:", err);
    throw new Error(err.message || "Failed to save navigation");
  }
}

export async function deleteNavigation(id: string): Promise<void> {
  try {
    await cmsRepo.deleteNavigation(id);
    try { revalidatePath("/admin/cms/navigation"); } catch {}
  } catch (err: any) {
    console.error("Error in deleteNavigation:", err);
    throw new Error(err.message || "Failed to delete navigation");
  }
}

// ============================================================================
// CMS MEDIA LIBRARY — Prisma CmsMediaLibrary model
// ============================================================================

export async function getMedia(): Promise<CMSMediaItem[]> {
  try {
    return await cmsRepo.getMedia();
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

  // Get current user ID safely
  let userId: string | null = null;
  try {
    const { getServerSession } = await import("@/lib/auth/server");
    const { user } = await getServerSession();
    userId = user?.id ?? null;
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

    // Convert file to data URI for storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "application/octet-stream";

    // Try Supabase storage upload first, fallback to data URI
    let fileUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    try {
      const { createAdminClient } = await import("@/lib/supabase/admin-client");
      const adminSupabase = createAdminClient();
      const { data: uploadData, error: uploadError } = await adminSupabase.storage
        .from("media")
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = adminSupabase.storage.from("media").getPublicUrl(fileName);
        if (publicUrlData?.publicUrl && !publicUrlData.publicUrl.startsWith("data:")) {
          fileUrl = publicUrlData.publicUrl;
        }
      }
    } catch {
      // Fallback: use data URI
    }

    // Save to Prisma CmsMediaLibrary
    const record = await cmsRepo.createMedia({
      fileName: file.name,
      fileUrl,
      fileType: mimeType,
      fileSizeBytes: file.size,
      uploadedBy: userId,
    });

    uploadedRecords.push(record);
  }

  try { revalidatePath("/admin/cms/media"); } catch {}
  return { success: true, count: uploadedRecords.length, data: uploadedRecords };
}

export async function deleteMedia(id: string, fileUrl?: string) {
  try {
    // Try to remove from Supabase storage if it's not a data URI
    if (fileUrl && !fileUrl.startsWith("data:") && !fileUrl.startsWith("blob:")) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin-client");
        const supabase = createAdminClient();
        const url = new URL(fileUrl);
        const match = url.pathname.match(/\/media\/(.+)$/);
        if (match && match[1]) {
          const storagePath = decodeURIComponent(match[1]);
          await supabase.storage.from("media").remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn("Storage removal non-fatal:", storageErr);
      }
    }

    // Delete from Prisma
    await cmsRepo.deleteMedia(id);
    try { revalidatePath("/admin/cms/media"); } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("Delete media error:", err);
    return { success: false, error: err.message };
  }
}

export async function seedSampleMedia() {
  try {
    const sampleAssets = [
      {
        fileName: "hero-summer-collection.jpg",
        fileUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
        fileType: "image/jpeg",
        fileSizeBytes: 1845200,
        altText: "Summer Luxury Fashion Collection",
      },
      {
        fileName: "fashion-autumn-coat.jpg",
        fileUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop",
        fileType: "image/jpeg",
        fileSizeBytes: 2154000,
        altText: "Autumn Winter Designer Overcoat",
      },
      {
        fileName: "lookbook-streetwear-hoodie.jpg",
        fileUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1200&auto=format&fit=crop",
        fileType: "image/jpeg",
        fileSizeBytes: 1420300,
        altText: "Urban Streetwear Premium Hoodie",
      },
      {
        fileName: "accessories-luxury-handbag.jpg",
        fileUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop",
        fileType: "image/jpeg",
        fileSizeBytes: 980400,
        altText: "Italian Leather Luxury Handbag",
      },
      {
        fileName: "footwear-minimalist-sneaker.jpg",
        fileUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop",
        fileType: "image/jpeg",
        fileSizeBytes: 1120000,
        altText: "Minimalist Leather Craft Sneaker",
      },
    ];

    const results: CMSMediaItem[] = [];
    for (const asset of sampleAssets) {
      const item = await cmsRepo.createMedia(asset);
      results.push(item);
    }

    try { revalidatePath("/admin/cms/media"); } catch {}
    return { success: true, count: results.length };
  } catch (err: any) {
    console.error("Failed to seed sample media:", err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// BANNERS / HERO SLIDES — 100% Prisma (banners table in Neon)
// ============================================================================

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

export type PromoBanner = {
  id: string;
  title: string | null;
  description: string | null;
  image_desktop: string;
  cta_text: string | null;
  cta_url: string | null;
  bg_color: string | null;
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
];

function isBannerActive(b: any, now: Date): boolean {
  if (b.is_active === false) return false;
  if (b.start_date && b.end_date) {
    const s = new Date(b.start_date).getTime();
    const e = new Date(b.end_date).getTime();
    if (s > e) return true; // Inverted dates — treat as always active
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

function prismaRowToHeroSlide(b: any): HeroSlide {
  return {
    id: b.id,
    image_url: b.image_url,
    media_url: b.media_url ?? b.image_url,
    image: b.image_url,
    link_url: b.link_url,
    cta_url: b.link_url,
    ctaHref: b.link_url,
    display_order: b.display_order ?? 0,
    title: b.title,
    headline: b.title,
    subtitle: b.subtitle,
    subheadline: b.subtitle,
    description: b.description ?? null,
    cta_text: b.cta_text ?? "Shop Now",
    is_active: b.is_active,
    start_date: b.start_date ?? null,
    end_date: b.end_date ?? null,
    placement: b.placement as "hero" | "promo",
    isVideo: b.is_video ?? false,
  };
}

// Public-facing hero slides (active only)
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const now = new Date();
    const banners = await cmsRepo.getBanners("hero");
    const slides = banners
      .filter((b) => isBannerActive(b, now))
      .map(prismaRowToHeroSlide)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return slides.length > 0 ? slides : DEFAULT_SLIDES;
  } catch {
    return DEFAULT_SLIDES;
  }
}

// Public-facing promo banner
export async function getFeaturedPromoBanner(): Promise<FeaturedPromoBannerData> {
  try {
    const now = new Date();
    const banners = await cmsRepo.getBanners("promo");
    const promoBanner = banners.find((b) => isBannerActive(b, now));
    if (!promoBanner) return DEFAULT_PROMO_BANNER;
    return {
      id: promoBanner.id,
      title: promoBanner.title || DEFAULT_PROMO_BANNER.title,
      subtitle: promoBanner.subtitle || DEFAULT_PROMO_BANNER.subtitle,
      description: promoBanner.description || DEFAULT_PROMO_BANNER.description,
      ctaText: promoBanner.cta_text || DEFAULT_PROMO_BANNER.ctaText,
      ctaLink: promoBanner.link_url || DEFAULT_PROMO_BANNER.ctaLink,
      imageUrl: promoBanner.image_url || DEFAULT_PROMO_BANNER.imageUrl,
    };
  } catch {
    return DEFAULT_PROMO_BANNER;
  }
}

// Admin: get ALL banners (hero + promo, active + inactive)
export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  try {
    const [heroBanners, promoBanners] = await Promise.all([
      cmsRepo.getBanners("hero"),
      cmsRepo.getBanners("promo"),
    ]);
    return [...heroBanners, ...promoBanners]
      .map(prismaRowToHeroSlide)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  } catch {
    return [];
  }
}

// Admin: get all banners (public promo sections)
export async function getPromoSections(): Promise<PromoBanner[]> {
  try {
    const banners = await cmsRepo.getBanners("promo");
    return banners.map((b) => ({
      id: b.id,
      title: b.title ?? null,
      description: b.description ?? null,
      image_desktop: b.image_url ?? "",
      cta_text: b.cta_text ?? null,
      cta_url: b.link_url ?? null,
      bg_color: null,
    }));
  } catch {
    return [];
  }
}

// Upsert a hero/promo slide (without file upload)
export async function upsertHeroSlide(
  slide: Partial<HeroSlide> & { image_url: string; link_url: string }
) {
  try {
    const result = await cmsRepo.upsertBanner({
      id: typeof slide.id === "string" ? slide.id : undefined,
      title: slide.title?.trim() || slide.headline?.trim() || "Hero Banner",
      subtitle: slide.subtitle || slide.subheadline || "",
      description: slide.description || "",
      ctaText: slide.cta_text || "Shop Now",
      linkUrl: slide.link_url || "/products",
      imageUrl: slide.image_url,
      mediaUrl: slide.media_url || slide.image_url,
      placement: slide.placement || "hero",
      displayOrder: slide.display_order ?? 0,
      isActive: slide.is_active !== false,
      isVideo: slide.isVideo ?? false,
      startDate: slide.start_date || null,
      endDate: slide.end_date || null,
    });

    try {
      invalidateHomepageCache();
      revalidatePath("/admin/cms/banners");
      revalidatePath("/manager/cms/banners");
      revalidatePath("/");
    } catch {}

    return { success: true, id: result.id };
  } catch (error: any) {
    console.error("upsertHeroSlide error:", error);
    return { success: false, error: error.message };
  }
}

// Upsert a hero/promo slide WITH file upload (FormData)
export async function upsertHeroSlideWithUpload(formData: FormData) {
  try {
    const id = formData.get("id") as string | null;
    const link_url = (formData.get("link_url") as string) || "/products";
    const display_order_str = (formData.get("display_order") as string) || "0";
    const placement = (formData.get("placement") as string) || "hero";
    let image_url = (formData.get("image_url") as string) || "";

    const file = formData.get("file") as File | null;

    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image file size must be less than 5MB");
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || "image/jpeg";

      // Try Supabase storage first
      let uploadedUrl = "";
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin-client");
        const supabase = createAdminClient();
        const fileName = `banners/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (!uploadError) {
          const { data: pubData } = supabase.storage.from("media").getPublicUrl(fileName);
          if (pubData?.publicUrl && !pubData.publicUrl.startsWith("data:")) {
            uploadedUrl = pubData.publicUrl;
          }
        }
      } catch {}

      // Fallback: data URI
      image_url = uploadedUrl || `data:${mimeType};base64,${buffer.toString("base64")}`;
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
    const end_date_raw = formData.get("end_date") as string | null;

    // Normalize end_date to end of day if only date provided
    let end_date: string | null = null;
    if (end_date_raw && end_date_raw.trim()) {
      const endDt = new Date(end_date_raw);
      if (end_date_raw.length <= 10) {
        endDt.setUTCHours(23, 59, 59, 999);
      }
      end_date = endDt.toISOString();
    }

    const result = await cmsRepo.upsertBanner({
      id: id || undefined,
      title,
      subtitle,
      description,
      ctaText: cta_text,
      linkUrl: link_url,
      imageUrl: image_url,
      mediaUrl: image_url,
      placement,
      displayOrder: parseInt(display_order_str, 10) || 0,
      isActive: is_active,
      startDate: start_date && start_date.trim() ? new Date(start_date).toISOString() : null,
      endDate: end_date,
    });

    try {
      invalidateHomepageCache();
      revalidatePath("/admin/cms/banners");
      revalidatePath("/manager/cms/banners");
      revalidatePath("/");
    } catch {}

    return { success: true, image_url, id: result.id };
  } catch (error: any) {
    console.error("upsertHeroSlideWithUpload error:", error);
    return { success: false, error: error.message };
  }
}

// Delete a single banner by ID
export async function deleteHeroSlide(id: string) {
  try {
    await cmsRepo.deleteBanner(id);

    try {
      invalidateHomepageCache();
      revalidatePath("/admin/cms/banners");
      revalidatePath("/manager/cms/banners");
      revalidatePath("/");
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error("deleteHeroSlide error:", error);
    return { success: false, error: error.message };
  }
}

// Delete all hero + promo banners
export async function deleteAllHeroSlides() {
  try {
    await cmsRepo.deleteAllBanners();

    try {
      invalidateHomepageCache();
      revalidatePath("/admin/cms/banners");
      revalidatePath("/manager/cms/banners");
      revalidatePath("/");
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error("deleteAllHeroSlides error:", error);
    return { success: false, error: error.message };
  }
}

// Public banners (for frontend)
export async function getBanners() {
  try {
    return await cmsRepo.getBanners();
  } catch {
    return [];
  }
}

// ============================================================================
// SEO SETTINGS — now persisted in the Settings (key-value) table via Prisma
// ============================================================================

export async function getSeoSettings() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.setting.findUnique({
      where: { key: "seo_settings" },
    });
    return (setting?.value as any) || {};
  } catch {
    return {};
  }
}

export async function updateSeoSettings(data: any) {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.setting.upsert({
      where: { key: "seo_settings" },
      update: { value: data, category: "seo" },
      create: { key: "seo_settings", value: data, category: "seo", description: "Global SEO settings" },
    });
    try { revalidatePath("/"); } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("updateSeoSettings error:", err);
    return { success: false, error: err.message };
  }
}
