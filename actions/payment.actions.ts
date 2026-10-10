"use server";

import { paymentService } from "@/services/payment.service";
import { paymentRefundService } from "@/services/payment-refund.service";
import {
  paymentInitializeSchema,
  refundRequestSchema,
  providerConfigSchema,
} from "@/validations/payment.schema";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function initializePaymentAction(formData: FormData) {
  const data = Object.fromEntries(formData.entries());

  const validation = paymentInitializeSchema.safeParse({
    ...data,
    amount: Number(data.amount),
  });

  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  try {
    const result = await paymentService.initializePayment(validation.data);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function requestRefundAction(formData: FormData) {
  const data = Object.fromEntries(formData.entries());

  const validation = refundRequestSchema.safeParse({
    ...data,
    amount: Number(data.amount),
  });

  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  try {
    const result = await paymentRefundService.requestRefund(validation.data);
    revalidatePath("/admin/payments/refunds");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleProviderStatusAction(
  providerId: string,
  status: "active" | "inactive"
) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("payment_providers")
    .update({ status })
    .eq("id", providerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/payments/providers");
  return { success: true };
}
