"use server";

import { marketingService } from "@/services/marketing.service";
import { Campaign, CampaignAudience } from "@/types/marketing.types";
import { revalidatePath } from "next/cache";
import {
  PromotionRepository,
  PromotionRecord,
  CreatePromotionInput,
} from "@/lib/repositories/marketing/promotion.repository";
import {
  CouponRepository,
  CouponRecord,
  CreateCouponInput,
} from "@/lib/repositories/marketing/coupon.repository";
import {
  promotionSchema,
  PromotionFormValues,
} from "@/validators/marketing.schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

// ============================================================================
// COUPONS ACTIONS
// ============================================================================

export async function getCouponsAction(): Promise<{
  success: boolean;
  data?: CouponRecord[];
  error?: string;
}> {
  try {
    const coupons = await CouponRepository.getCoupons();
    return { success: true, data: coupons };
  } catch (error: any) {
    console.error("[getCouponsAction] Error:", error);
    return { success: false, error: error.message || "Failed to fetch coupons" };
  }
}

export async function createCouponAction(
  data: CreateCouponInput
): Promise<{ success: boolean; data?: CouponRecord; error?: string }> {
  try {
    if (!data.code || !data.discount_type || !data.value) {
      return { success: false, error: "Code, discount type, and value are required" };
    }
    const coupon = await CouponRepository.createCoupon(data);
    revalidatePath("/admin/marketing/coupons");
    revalidatePath("/manager/marketing/coupons");
    revalidatePath("/manager/marketing");
    return { success: true, data: coupon };
  } catch (error: any) {
    console.error("[createCouponAction] Error:", error);
    return { success: false, error: error.message || "Failed to create coupon" };
  }
}

export async function toggleCouponStatusAction(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; data?: CouponRecord; error?: string }> {
  try {
    if (!id) return { success: false, error: "Coupon ID is required" };
    const coupon = await CouponRepository.toggleCouponStatus(id, is_active);
    revalidatePath("/admin/marketing/coupons");
    revalidatePath("/manager/marketing/coupons");
    revalidatePath("/manager/marketing");
    return { success: true, data: coupon };
  } catch (error: any) {
    console.error("[toggleCouponStatusAction] Error:", error);
    return { success: false, error: error.message || "Failed to toggle coupon status" };
  }
}

export async function deleteCouponAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Coupon ID is required" };
    await CouponRepository.deleteCoupon(id);
    revalidatePath("/admin/marketing/coupons");
    revalidatePath("/manager/marketing/coupons");
    revalidatePath("/manager/marketing");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteCouponAction] Error:", error);
    return { success: false, error: error.message || "Failed to delete coupon" };
  }
}

// ============================================================================
// PROMOTIONS ACTIONS
// ============================================================================

export async function createPromotionAction(
  data: PromotionFormValues
): Promise<{ success: boolean; data?: PromotionRecord; error?: string }> {
  try {
    const validated = promotionSchema.parse(data);
    const promo = await PromotionRepository.createPromotion(validated);
    revalidatePath("/admin/marketing/promotions");
    revalidatePath("/");
    revalidatePath("/products");
    return { success: true, data: promo };
  } catch (error: any) {
    console.error("[createPromotionAction] Error:", error);
    return { success: false, error: error.message || "Failed to create promotion" };
  }
}

export async function updatePromotionAction(
  id: string,
  data: Partial<PromotionFormValues>
): Promise<{ success: boolean; data?: PromotionRecord; error?: string }> {
  try {
    if (!id) return { success: false, error: "Promotion ID is required" };
    const promo = await PromotionRepository.updatePromotion(id, data);
    revalidatePath("/admin/marketing/promotions");
    revalidatePath("/");
    revalidatePath("/products");
    return { success: true, data: promo };
  } catch (error: any) {
    console.error("[updatePromotionAction] Error:", error);
    return { success: false, error: error.message || "Failed to update promotion" };
  }
}

export async function deletePromotionAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Promotion ID is required" };
    await PromotionRepository.deletePromotion(id);
    revalidatePath("/admin/marketing/promotions");
    revalidatePath("/");
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    console.error("[deletePromotionAction] Error:", error);
    return { success: false, error: error.message || "Failed to delete promotion" };
  }
}

export async function togglePromotionStatusAction(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; data?: PromotionRecord; error?: string }> {
  try {
    if (!id) return { success: false, error: "Promotion ID is required" };
    const promo = await PromotionRepository.togglePromotionStatus(id, is_active);
    revalidatePath("/admin/marketing/promotions");
    revalidatePath("/");
    revalidatePath("/products");
    return { success: true, data: promo };
  } catch (error: any) {
    console.error("[togglePromotionStatusAction] Error:", error);
    return { success: false, error: error.message || "Failed to toggle promotion status" };
  }
}

export async function getActivePromotionAction(): Promise<{
  success: boolean;
  data?: PromotionRecord | null;
  error?: string;
}> {
  try {
    const promo = await PromotionRepository.getBestActivePromotion();
    return { success: true, data: promo };
  } catch (error: any) {
    console.error("[getActivePromotionAction] Error:", error);
    return { success: false, error: error.message || "Failed to fetch active promotion" };
  }
}

// ============================================================================
// CAMPAIGNS ACTIONS
// ============================================================================

export async function getCampaignsAction(): Promise<{
  success: boolean;
  data?: Campaign[];
  error?: string;
}> {
  try {
    const campaigns = await marketingService.getCampaigns();
    return { success: true, data: campaigns };
  } catch (error: any) {
    console.error("[getCampaignsAction] Error:", error);
    return { success: false, error: error.message || "Failed to fetch campaigns" };
  }
}

export async function getCampaigns(): Promise<Campaign[]> {
  return await marketingService.getCampaigns();
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  return await marketingService.getCampaignById(id);
}

async function resolveCurrentAdminUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (e) {
    // ignore
  }

  // Fallback to active admin profile in database
  const adminSb = createAdminClient();
  const { data: prof } = await adminSb
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return prof?.id || "83dded7c-78c7-4f3f-8dd9-e82f8da7f0c0";
}

export async function createCampaign(data: any): Promise<Campaign> {
  const payload = { ...data };
  if (!payload.created_by) {
    payload.created_by = await resolveCurrentAdminUserId();
  }
  const campaign = await marketingService.createCampaign(payload);
  revalidatePath("/admin/marketing/campaigns");
  return campaign;
}

export async function updateCampaign(
  id: string,
  data: unknown
): Promise<Campaign> {
  const campaign = await marketingService.updateCampaign(id, data);
  revalidatePath("/admin/marketing/campaigns");
  return campaign;
}

export async function deleteCampaignAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Campaign ID is required" };
    await marketingService.deleteCampaign(id);
    revalidatePath("/admin/marketing/campaigns");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteCampaignAction] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete campaign",
    };
  }
}

export async function getAudiences(): Promise<CampaignAudience[]> {
  return await marketingService.getAudiences();
}

export async function createAudience(data: unknown): Promise<CampaignAudience> {
  const audience = await marketingService.createAudience(data);
  revalidatePath("/admin/marketing/campaigns");
  return audience;
}

/**
 * Creates and sends a campaign immediately via Resend
 */
export async function createAndSendCampaignAction(payload: {
  name: string;
  type: "email" | "push" | "sms" | "drip";
  subject?: string;
  content?: string;
  audience_id?: string | null;
}): Promise<{
  success: boolean;
  campaign?: Campaign;
  sentCount?: number;
  error?: string;
}> {
  try {
    const createdBy = await resolveCurrentAdminUserId();

    const newCampaign = await marketingService.createCampaign({
      name: payload.name.trim(),
      type: payload.type,
      subject: payload.subject?.trim() || null,
      content: payload.content?.trim() || null,
      audience_id: payload.audience_id || null,
      status: "draft",
      created_by: createdBy,
    });

    const sendResult = await marketingService.sendCampaign(newCampaign.id);

    revalidatePath("/admin/marketing/campaigns");
    revalidatePath("/manager/marketing/campaigns");
    revalidatePath("/manager/marketing");
    return {
      success: true,
      campaign: newCampaign,
      sentCount: sendResult.sentCount,
      error: sendResult.error,
    };
  } catch (err: any) {
    console.error("[createAndSendCampaignAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to create and dispatch campaign",
    };
  }
}

/**
 * Creates and schedules a campaign for a future date/time
 */
export async function createAndScheduleCampaignAction(payload: {
  name: string;
  type: "email" | "push" | "sms" | "drip";
  subject?: string;
  content?: string;
  audience_id?: string | null;
  scheduleTime: string;
}): Promise<{
  success: boolean;
  campaign?: Campaign;
  error?: string;
}> {
  try {
    const createdBy = await resolveCurrentAdminUserId();

    const newCampaign = await marketingService.createCampaign({
      name: payload.name.trim(),
      type: payload.type,
      subject: payload.subject?.trim() || null,
      content: payload.content?.trim() || null,
      audience_id: payload.audience_id || null,
      status: "draft",
      created_by: createdBy,
    });

    const scheduled = await marketingService.scheduleCampaign(
      newCampaign.id,
      payload.scheduleTime
    );

    revalidatePath("/admin/marketing/campaigns");
    revalidatePath("/manager/marketing/campaigns");
    revalidatePath("/manager/marketing");
    return {
      success: true,
      campaign: scheduled,
    };
  } catch (err: any) {
    console.error("[createAndScheduleCampaignAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to schedule campaign",
    };
  }
}
