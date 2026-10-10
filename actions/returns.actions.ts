"use server";

// ============================================================================
// Returns Server Actions
// ============================================================================

import { revalidatePath } from "next/cache";
import { ReturnsService } from "@/services/shipping/returns.service";
import {
  createReturnSchema,
  approveReturnSchema,
  rejectReturnSchema,
  returnFiltersSchema,
  submitCustomerReturnSchema,
} from "@/schemas/shipping.schema";
import { createClient } from "@/lib/supabase/server-client";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  ReturnEligibilityResult,
  ReturnWithItems,
} from "@/types/shipping.types";

type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getCurrentUser() {
  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

async function requireBranchAccess(returnId: string) {
  const user = await getCurrentUser();
  
  // Default to ADMIN role if accessed within authenticated staff/admin session
  const role = String(user?.user_metadata?.role || user?.app_metadata?.role || "ADMIN").toUpperCase();
  const staffRoleList = [
    "SUPERADMIN",
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "WAREHOUSE_MANAGER",
    "MARKETING_MANAGER",
    "FINANCE_MANAGER",
    "STAFF",
    "SUPPORT",
    "OPERATIONS",
  ];

  // If user is explicitly a customer and not staff, deny access
  if (user && role === "CUSTOMER") {
    throw new Error("Unauthorized: Insufficient staff permissions.");
  }

  if (user) {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("employee_profiles")
      .select("branch_id, roles")
      .eq("id", user.id)
      .maybeSingle();

    const isGlobalAdmin = ["SUPERADMIN", "SUPER_ADMIN", "ADMIN"].includes(role);
    // Only enforce branch filtering if user is not global admin and has a branch assigned
    if (!isGlobalAdmin && profile?.branch_id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(returnId);
      let query = adminClient.from("returns").select("orders(branch_id)");
      query = isUuid ? query.eq("id", returnId) : query.eq("return_number", returnId);
      const { data: returnData } = await query.maybeSingle();

      // @ts-ignore
      const orderBranch = returnData?.orders?.branch_id;
      if (orderBranch && orderBranch !== profile.branch_id) {
        throw new Error("Unauthorized: You can only access returns for your assigned branch.");
      }
    }
  }

  return true;
}

// ============================================================================
// Customer Self-Service Actions
// ============================================================================

/**
 * Check authoritative return eligibility for an order
 */
export async function checkReturnEligibilityAction(
  orderId: string
): Promise<ActionResponse<ReturnEligibilityResult>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to check return eligibility." };
    }

    const service = new ReturnsService();
    const result = await service.checkReturnEligibility(orderId, user.id);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit a customer return request
 */
export async function submitCustomerReturnAction(
  raw: Record<string, any>
): Promise<ActionResponse<{ returnId: string; returnNumber: string }>> {
  const parse = submitCustomerReturnSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to submit a return request." };
    }

    const service = new ReturnsService();
    const returnRecord = await service.submitCustomerReturn(
      parse.data as any,
      user.id
    );

    revalidatePath("/account/returns");
    revalidatePath(`/account/orders/${parse.data.orderId}`);
    revalidatePath("/admin/shipping/returns");

    return {
      success: true,
      data: {
        returnId: returnRecord.id,
        returnNumber: returnRecord.return_number,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all returns for the authenticated customer
 */
export async function fetchCustomerReturnsAction(): Promise<
  ActionResponse<ReturnWithItems[]>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to view returns." };
    }

    const service = new ReturnsService();
    const returns = await service.getCustomerReturns(user.id);
    return { success: true, data: returns };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch return details for a specific return owned by customer
 */
export async function fetchCustomerReturnDetailAction(
  returnId: string
): Promise<ActionResponse<ReturnWithItems>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to view return details." };
    }

    const service = new ReturnsService();
    const returnRecord = await service.getCustomerReturnDetail(returnId, user.id);
    if (!returnRecord) {
      return { success: false, error: "Return record not found." };
    }

    return { success: true, data: returnRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Secure Photo Proof Upload for returns
 */
export async function uploadReturnProofAction(
  formData: FormData
): Promise<ActionResponse<{ url: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to upload proof." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No image file provided." };
    }

    // 1. Validate MIME type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      return {
        success: false,
        error: "Invalid file type. Only JPG, PNG, and WebP images are permitted.",
      };
    }

    // 2. Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: "File size exceeds 5MB limit. Please upload a smaller image.",
      };
    }

    // 3. Upload to return_proofs storage bucket
    const adminSupabase = createAdminClient();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await adminSupabase.storage
      .from("return_proofs")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }

    const { data: publicData } = adminSupabase.storage
      .from("return_proofs")
      .getPublicUrl(filePath);

    return {
      success: true,
      data: { url: publicData.publicUrl },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Admin & Management Actions
// ============================================================================

export async function createReturnRequestAction(
  raw: Record<string, any>
): Promise<ActionResponse<{ returnId: string; returnNumber: string }>> {
  const parse = createReturnSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const user = await getCurrentUser();
    const service = new ReturnsService();
    const returnRecord = await service.createReturnRequest(
      parse.data as any,
      user?.id,
      user?.id
    );

    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/orders/${parse.data.orderId}`);

    return {
      success: true,
      data: {
        returnId: returnRecord.id,
        returnNumber: returnRecord.return_number,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveReturnAction(
  returnId: string
): Promise<ActionResponse<{ returnId: string }>> {
  const parse = approveReturnSchema.safeParse({ returnId });
  if (!parse.success) {
    return { success: false, error: "Invalid return ID" };
  }

  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    await service.approveReturn(returnId, user?.id);

    revalidatePath("/admin/shipping/returns");
    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);

    return { success: true, data: { returnId } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectReturnAction(
  returnId: string,
  reason: string
): Promise<ActionResponse<{ returnId: string }>> {
  const parse = rejectReturnSchema.safeParse({ returnId, reason });
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    await service.rejectReturn(returnId, reason, user?.id);

    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);

    return { success: true, data: { returnId } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchReturnsAction(
  rawFilters: Record<string, any> = {}
): Promise<ActionResponse<any>> {
  const parse = returnFiltersSchema.safeParse(rawFilters);
  if (!parse.success) {
    return { success: false, error: "Invalid filters" };
  }

  try {
    const user = await getCurrentUser();
    let branchId: string | undefined;

    if (user) {
      const adminClient = createAdminClient();
      const { data: profile } = await adminClient
        .from("employee_profiles")
        .select("branch_id, roles")
        .eq("id", user.id)
        .maybeSingle();

      const role = String(user.user_metadata?.role || user.app_metadata?.role || "").toUpperCase();
      const isGlobalAdmin =
        ["SUPERADMIN", "SUPER_ADMIN", "ADMIN"].includes(role) ||
        profile?.roles?.some((r: string) => ["admin", "superadmin"].includes(String(r).toLowerCase()));

      if (!isGlobalAdmin && profile?.branch_id) {
        branchId = profile.branch_id;
      }
    }

    const filters = { ...parse.data, branchId };

    const service = new ReturnsService();
    const result = await service.listReturns(filters as any);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchReturnByIdAction(
  returnId: string
): Promise<ActionResponse<any>> {
  try {
    if (!returnId || returnId === "undefined") {
      return { success: false, error: "Return ID is required" };
    }
    await requireBranchAccess(returnId);
    const service = new ReturnsService();
    const returnRecord = await service.getReturnWithItems(returnId);

    if (!returnRecord) return { success: false, error: "Return not found" };
    return { success: true, data: returnRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markReturnReceivedAction(
  returnId: string
): Promise<ActionResponse<{ returnId: string }>> {
  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    await service.markReturnReceived(returnId, user?.id);

    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);

    return { success: true, data: { returnId } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function syncReturnInventoryAction(
  returnId: string,
  itemConditions: Record<string, "good" | "damaged" | "defective"> = {}
): Promise<ActionResponse<{ returnId: string }>> {
  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    await service.processReturnRestock(returnId, itemConditions, user?.id);

    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);

    return { success: true, data: { returnId } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function completeReturnAction(
  returnId: string
): Promise<ActionResponse<{ returnId: string }>> {
  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    await service.completeReturn(returnId, user?.id);

    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);

    return { success: true, data: { returnId } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function processReturnRefundAction(
  returnId: string
): Promise<ActionResponse<{ success: boolean; method: string; refundRef?: string }>> {
  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    const result = await service.processReturnRefund(returnId, user?.id);

    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resolveReturnRefundAction(
  returnId: string,
  options?: {
    refundMethod?: "WALLET" | "MANUAL_BANK" | "MANUAL_CASH" | "GATEWAY_CONFIRMED";
    note?: string;
  }
): Promise<ActionResponse<{ returnId: string; refundStatus: string; status: string }>> {
  try {
    await requireBranchAccess(returnId);
    const user = await getCurrentUser();
    const service = new ReturnsService();
    const result = await service.resolveReturnWithRefund(returnId, options, user?.id);

    revalidatePath("/admin/orders/returns");
    revalidatePath(`/admin/orders/returns/${returnId}`);
    revalidatePath("/admin/shipping/returns");
    revalidatePath(`/admin/shipping/returns/${returnId}`);
    revalidatePath("/account/returns");
    revalidatePath(`/account/returns/${returnId}`);

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
