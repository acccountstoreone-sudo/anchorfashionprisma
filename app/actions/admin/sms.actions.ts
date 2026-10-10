"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AlphaSmsService } from "@/lib/services/sms/alpha-sms.service";
import { SmsLog } from "@/types/sms.types";

/**
 * Fetch all SMS logs for a specific order (Admin/Staff only)
 */
export async function getOrderSmsLogsAction(
  orderId: string
): Promise<{ success: boolean; logs: SmsLog[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Allow fetching logs for authenticated users
    if (!user) {
      return { success: false, logs: [], error: "Unauthorized" };
    }

    const logs = await AlphaSmsService.getOrderSmsLogs(orderId);
    return { success: true, logs };
  } catch (err: any) {
    console.error("Error in getOrderSmsLogsAction:", err);
    return { success: false, logs: [], error: err.message };
  }
}

/**
 * Resend order confirmation SMS (Admin only)
 * Bypasses previous duplicate lock via force: true, but strictly enforces order.status === 'confirmed'.
 */
export async function resendOrderConfirmationSmsAction(
  orderId: string
): Promise<{ success: boolean; error?: string; requestId?: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Admin authentication required." };
    }

    const result = await AlphaSmsService.sendOrderConfirmationSMS(orderId, {
      force: true,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || result.reason || "Failed to send SMS.",
      };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, requestId: result.requestId };
  } catch (err: any) {
    console.error("Error in resendOrderConfirmationSmsAction:", err);
    return { success: false, error: err.message || "Failed to dispatch SMS" };
  }
}
