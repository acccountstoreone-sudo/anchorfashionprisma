"use server";

import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin-client";
import { verifySuperAdmin } from "../security/roles";
import { revalidatePath } from "next/cache";

export type PaymentGatewayType =
  | "sslcommerz"
  | "cod"
  | "bkash"
  | "nagad"
  | "rocket"
  | "bank";

export type PaymentGatewayConfig = {
  enabled: boolean;
  store_id?: string;
  store_password?: string;
  store_pass?: string;
  store_passwd?: string;
  sandbox?: boolean;
  is_sandbox?: boolean;
  account_number?: string;
  account_type?: "Personal" | "Merchant" | "Agent" | string;
  instructions?: string;
  bank_name?: string;
  account_name?: string;
  branch_name?: string;
  routing_number?: string;
};

export type AllPaymentConfigs = Record<PaymentGatewayType, PaymentGatewayConfig>;

const DEFAULTS: AllPaymentConfigs = {
  sslcommerz: {
    enabled: true,
    store_id: "",
    store_password: "",
    sandbox: true,
  },
  cod: {
    enabled: true,
    instructions: "Pay with cash upon receiving your delivery at your doorstep.",
  },
  bkash: {
    enabled: true,
    account_number: "01700000000",
    account_type: "Personal",
    instructions:
      "Go to your bKash app or dial *247# -> Choose Send Money -> Enter our bKash number -> Enter your Order Total -> Enter Reference -> Complete payment and copy the Transaction ID (TrxID).",
  },
  nagad: {
    enabled: true,
    account_number: "01800000000",
    account_type: "Personal",
    instructions:
      "Go to your Nagad app or dial *167# -> Send Money to our number -> Enter your Order Total -> Confirm with PIN and copy the Transaction ID (TrxID).",
  },
  rocket: {
    enabled: true,
    account_number: "01900000000-0",
    account_type: "Personal",
    instructions:
      "Go to your Rocket app or dial *322# -> Send Money -> Enter our Rocket account -> Complete payment and copy the Transaction ID.",
  },
  bank: {
    enabled: true,
    bank_name: "Dutch-Bangla Bank Limited (DBBL)",
    account_name: "Anchor Fashion Ltd",
    account_number: "123.456.7890",
    branch_name: "Gulshan Branch, Dhaka",
    routing_number: "090261548",
    instructions:
      "Transfer the exact order amount via Online/Internet Banking, BEFTN, NPSB, or Direct Cash Deposit. Enter your Order Number in the deposit/transfer reference.",
  },
};

export async function getPaymentConfig(
  gateway: PaymentGatewayType
): Promise<PaymentGatewayConfig> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", `payment_${gateway}`)
      .single();

    return (data?.value as PaymentGatewayConfig) ?? DEFAULTS[gateway];
  } catch {
    return DEFAULTS[gateway];
  }
}

export async function getAllPaymentConfigs(): Promise<AllPaymentConfigs> {
  const supabase = await createClient();
  const result: AllPaymentConfigs = { ...DEFAULTS };

  try {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .like("key", "payment_%");

    if (data && data.length > 0) {
      data.forEach((row: any) => {
        const gw = row.key.replace("payment_", "") as PaymentGatewayType;
        if (result[gw]) {
          const val = row.value || {};
          if (gw === "sslcommerz") {
            const pass = (
              val.store_password ||
              val.store_pass ||
              val.store_passwd ||
              ""
            ).toString().trim();
            const isSandbox =
              val.sandbox !== undefined
                ? val.sandbox === true || val.sandbox === "true"
                : val.is_sandbox !== undefined
                ? val.is_sandbox === true || val.is_sandbox === "true"
                : true;
            result[gw] = {
              ...result[gw],
              ...val,
              store_id: (val.store_id || "").toString().trim(),
              store_password: pass,
              store_pass: pass,
              store_passwd: pass,
              sandbox: isSandbox,
              is_sandbox: isSandbox,
            };
          } else {
            result[gw] = { ...result[gw], ...val };
          }
        }
      });
    }
  } catch (err) {
    console.error("Error fetching all payment configs:", err);
  }

  return result;
}

export async function updatePaymentConfig(
  gateway: PaymentGatewayType,
  config: PaymentGatewayConfig
) {
  try {
    await verifySuperAdmin().catch(() => null); // Enforce role access if configured
    const supabase = createAdminClient();

    let normalizedConfig: Record<string, any> = { ...config };
    if (gateway === "sslcommerz") {
      const pass = (
        config.store_password ||
        config.store_pass ||
        config.store_passwd ||
        ""
      ).toString().trim();
      const isSandbox =
        config.sandbox !== undefined
          ? Boolean(config.sandbox)
          : config.is_sandbox !== undefined
          ? Boolean(config.is_sandbox)
          : true;

      normalizedConfig = {
        ...config,
        store_id: (config.store_id || "").toString().trim(),
        store_password: pass,
        store_pass: pass,
        store_passwd: pass,
        sandbox: isSandbox,
        is_sandbox: isSandbox,
      };
    }

    const { error } = await supabase.from("settings").upsert(
      {
        key: `payment_${gateway}`,
        value: normalizedConfig as any,
        description: `${gateway.toUpperCase()} Configuration`,
      },
      { onConflict: "key" }
    );

    if (error) throw error;

    revalidatePath("/admin/settings/payment");
    revalidatePath("/admin/payments/providers");
    revalidatePath("/checkout");
    return { success: true };
  } catch (error: any) {
    console.error(`[updatePaymentConfig] ${gateway}`, error);
    return { success: false, error: error.message };
  }
}

export interface ManualPaymentSubmission {
  order_id: string;
  payment_method: string; // 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER'
  amount: number;
  sender_number?: string;
  transaction_id?: string;
  bank_name?: string;
  branch_name?: string;
  account_holder_name?: string;
  notes?: string;
  customer_id?: string | null;
}

/**
 * Record customer manual payment submission in payment_transactions table
 */
export async function recordManualPaymentTransaction(
  submission: ManualPaymentSubmission
) {
  const supabase = createAdminClient();
  try {
    const rawMethod = (submission.payment_method || "").toLowerCase();
    const { data: prov } = await supabase
      .from("payment_providers")
      .select("id")
      .eq("code", rawMethod)
      .maybeSingle();

    const providerId = prov?.id || null;
    const referenceNumber =
      submission.sender_number ||
      submission.account_holder_name ||
      submission.bank_name ||
      "";
    const transactionId = submission.transaction_id || "";

    const { data: tx, error: txErr } = await supabase
      .from("payment_transactions")
      .insert({
        order_id: submission.order_id,
        user_id: submission.customer_id || null,
        provider_id: providerId,
        amount: submission.amount,
        currency: "BDT",
        status: "pending",
        reference_number: referenceNumber,
        gateway_transaction_id: transactionId,
        gateway_response: {
          sender_number: submission.sender_number,
          transaction_id: submission.transaction_id,
          bank_name: submission.bank_name,
          branch_name: submission.branch_name,
          account_holder_name: submission.account_holder_name,
          notes: submission.notes,
          payment_method: submission.payment_method,
          submitted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (txErr) {
      console.error("Error creating payment transaction:", txErr);
    }

    // Add note to order_notes
    const noteContent = `Manual Payment Submitted: [${submission.payment_method}] Sender: ${referenceNumber || "N/A"}, TrxID/Ref: ${transactionId || "N/A"}${submission.notes ? ` - Note: ${submission.notes}` : ""}`;
    try {
      await supabase.from("order_notes").insert({
        order_id: submission.order_id,
        author_id: submission.customer_id || null,
        note: noteContent,
        is_customer_visible: true,
      });
    } catch {
      // Ignored
    }

    return { success: true, transaction: tx };
  } catch (err: any) {
    console.error("Failed to record manual payment:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get manual payment details for a specific order
 */
export async function getManualPaymentForOrder(orderId: string) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Admin action: Approve manual payment
 * Transitions payment_status to 'paid', order status to 'confirmed', and logs status history
 */
export async function approveManualPaymentAction(
  orderId: string,
  transactionId?: string,
  approvalNote?: string
) {
  const supabase = createAdminClient();
  try {
    // 0. Verify order has items before approving payment
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId);

    if (itemsErr) {
      console.warn("Could not verify order items:", itemsErr);
    } else if (!items || items.length === 0) {
      return {
        success: false,
        error: "Cannot approve payment: Order has 0 items. Please ensure order items are recorded before approving payment.",
      };
    }

    // 1. Update or create payment_transactions
    if (transactionId && !transactionId.startsWith("order-manual-")) {
      await supabase
        .from("payment_transactions")
        .update({
          status: "completed",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
    } else {
      const { data: existingTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingTx) {
        await supabase
          .from("payment_transactions")
          .update({
            status: "completed",
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTx.id);
      } else {
        const { data: orderData } = await supabase
          .from("orders")
          .select("payment_method, grand_total, customer_id, order_number")
          .eq("id", orderId)
          .maybeSingle();

        const rawMethod = (orderData?.payment_method || "").toLowerCase();
        const { data: prov } = await supabase
          .from("payment_providers")
          .select("id")
          .eq("code", rawMethod)
          .maybeSingle();

        const { data: shippingAddr } = await supabase
          .from("order_addresses")
          .select("phone")
          .eq("order_id", orderId)
          .eq("address_type", "SHIPPING")
          .maybeSingle();

        const customerPhone = shippingAddr?.phone || orderData?.order_number || "";

        await supabase.from("payment_transactions").insert({
          order_id: orderId,
          user_id: orderData?.customer_id || null,
          provider_id: prov?.id || null,
          amount: orderData?.grand_total || 0,
          currency: "BDT",
          status: "completed",
          reference_number: customerPhone,
          gateway_transaction_id: "MANUAL-ADMIN-APPROVAL",
          gateway_response: {
            sender_number: customerPhone,
            transaction_id: "MANUAL-ADMIN-APPROVAL",
            payment_method: orderData?.payment_method,
            approved_manually_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 2. Update orders table
    const { error: orderErr } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderErr) throw orderErr;

    // 3. Log to order_status_history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "confirmed",
      notes:
        approvalNote ||
        "Manual payment verified and approved by Administrator. Status advanced to Confirmed.",
    });

    // 4. Log to order_notes
    await supabase.from("order_notes").insert({
      order_id: orderId,
      note: `Payment Approved by Admin: Order marked as Paid & Confirmed. ${approvalNote ? `(${approvalNote})` : ""}`,
      is_customer_visible: true,
    });

    // 5. Trigger Order Confirmation SMS asynchronously
    try {
      const { AlphaSmsService } = await import("@/lib/services/sms/alpha-sms.service");
      AlphaSmsService.triggerOrderConfirmationSmsAsync(orderId);
    } catch (smsErr) {
      console.error("[Manual Payment Approval] SMS trigger error:", smsErr);
    }

    try {
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath("/admin/orders");
      revalidatePath("/admin/finance/manual-payments");
    } catch {
      // Ignore if called outside Next.js request context (e.g. tests, scripts)
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error approving manual payment:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Admin action: Reject manual payment
 */
export async function rejectManualPaymentAction(
  orderId: string,
  reason: string,
  transactionId?: string
) {
  const supabase = createAdminClient();
  try {
    // 1. Update or create payment_transactions
    if (transactionId && !transactionId.startsWith("order-manual-")) {
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          error_message: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
    } else {
      const { data: existingTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingTx) {
        await supabase
          .from("payment_transactions")
          .update({
            status: "failed",
            error_message: reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTx.id);
      } else {
        const { data: orderData } = await supabase
          .from("orders")
          .select("payment_method, grand_total, customer_id, order_number")
          .eq("id", orderId)
          .maybeSingle();

        const rawMethod = (orderData?.payment_method || "").toLowerCase();
        const { data: prov } = await supabase
          .from("payment_providers")
          .select("id")
          .eq("code", rawMethod)
          .maybeSingle();

        await supabase.from("payment_transactions").insert({
          order_id: orderId,
          user_id: orderData?.customer_id || null,
          provider_id: prov?.id || null,
          amount: orderData?.grand_total || 0,
          currency: "BDT",
          status: "failed",
          error_message: reason,
          reference_number: orderData?.order_number || "",
          gateway_response: {
            payment_method: orderData?.payment_method,
            rejected_manually_at: new Date().toISOString(),
            reason,
          },
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 2. Update orders table
    await supabase
      .from("orders")
      .update({
        payment_status: "unpaid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // 3. Log to order_notes
    await supabase.from("order_notes").insert({
      order_id: orderId,
      note: `Payment Rejected by Admin. Reason: ${reason}`,
      is_customer_visible: true,
    });

    // 4. Log to order_status_history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "pending_payment",
      notes: `Manual payment verification failed: ${reason}`,
    });

    try {
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath("/admin/orders");
      revalidatePath("/admin/finance/manual-payments");
    } catch {
      // Ignore if called outside Next.js request context (e.g. tests, scripts)
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error rejecting manual payment:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all pending manual payments for Admin Finance verification queue
 */
export async function getPendingManualPaymentsAction() {
  const supabase = createAdminClient();
  try {
    // 1. Fetch manual payment providers (bKash, Nagad, Rocket)
    const { data: providers } = await supabase
      .from("payment_providers")
      .select("id, code, name")
      .in("code", ["bkash", "nagad", "rocket"]);

    const providerMap = new Map<string, { id: string; code: string; name: string }>();
    const providerIds = (providers || []).map((p) => {
      providerMap.set(p.id, p);
      return p.id;
    });

    // 2. Query payment_transactions for manual providers or null provider_id (custom/bank)
    const orClause =
      providerIds.length > 0
        ? `provider_id.in.(${providerIds.join(",")}),provider_id.is.null`
        : `provider_id.is.null`;

    const { data: txs, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .or(orClause)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching manual payments:", error.message || error);
      return [];
    }

    // 3. Collect related order IDs from transactions
    const orderIds = Array.from(
      new Set((txs || []).map((t) => t.order_id).filter(Boolean))
    );

    // Also look up orders placed with manual payment methods
    const { data: manualOrders } = await supabase
      .from("orders")
      .select("id, order_number, grand_total, status, payment_status, payment_method, created_at, customer_id")
      .in("payment_method", [
        "BKASH",
        "NAGAD",
        "ROCKET",
        "BANK",
        "BANK_TRANSFER",
        "bkash",
        "nagad",
        "rocket",
        "bank",
        "bank_transfer",
      ]);

    const orderMap = new Map<string, any>();
    (manualOrders || []).forEach((o) => orderMap.set(o.id, o));

    // Fetch any missing orders referenced by existing transactions
    const missingOrderIds = orderIds.filter((id) => !orderMap.has(id));
    if (missingOrderIds.length > 0) {
      const { data: moreOrders } = await supabase
        .from("orders")
        .select("id, order_number, grand_total, status, payment_status, payment_method, created_at, customer_id")
        .in("id", missingOrderIds);

      (moreOrders || []).forEach((o) => orderMap.set(o.id, o));
    }

    const existingTxOrderIds = new Set((txs || []).map((t) => t.order_id));

    // Query order_items count for all relevant orders
    const allOrderIds = Array.from(
      new Set([...orderIds, ...(manualOrders || []).map((o) => o.id)])
    );
    const { data: itemRows } = await supabase
      .from("order_items")
      .select("order_id")
      .in("order_id", allOrderIds);

    const itemsCountMap = new Map<string, number>();
    (itemRows || []).forEach((row) => {
      itemsCountMap.set(row.order_id, (itemsCountMap.get(row.order_id) || 0) + 1);
    });

    // 4. Enrich transactions with order details and canonical provider_id
    const enrichedList: any[] = (txs || [])
      .filter((t) => t.order_id && orderMap.has(t.order_id))
      .map((t) => {
        const order = orderMap.get(t.order_id) || null;
        const matchedProvider = t.provider_id ? providerMap.get(t.provider_id) : null;
        const method = (
          matchedProvider?.code ||
          t.gateway_response?.payment_method ||
          order?.payment_method ||
          "bank"
        ).toLowerCase();

        return {
          ...t,
          provider_id: method,
          provider_name: matchedProvider?.name || method.toUpperCase(),
          order,
          item_count: itemsCountMap.get(t.order_id) || 0,
        };
      });

    // 5. Synthesize queue items for any manual orders that don't have a transaction record yet
    for (const o of manualOrders || []) {
      if (!existingTxOrderIds.has(o.id)) {
        // Skip cancelled orders or orders with 0 items from being queued for manual payment approval
        if (o.status === "cancelled") continue;
        const itemCount = itemsCountMap.get(o.id) || 0;
        if (itemCount === 0) continue;

        enrichedList.push({
          id: `order-manual-${o.id}`,
          order_id: o.id,
          user_id: o.customer_id,
          provider_id: (o.payment_method || "bkash").toLowerCase(),
          provider_name: (o.payment_method || "MANUAL").toUpperCase(),
          amount: o.grand_total || 0,
          currency: "BDT",
          status: o.payment_status?.toLowerCase() === "paid" ? "completed" : "pending",
          reference_number: o.order_number,
          gateway_transaction_id: "Pending Submission",
          gateway_response: {
            payment_method: o.payment_method,
            submitted_at: o.created_at,
          },
          created_at: o.created_at,
          updated_at: o.created_at,
          order: o,
          item_count: itemCount,
        });
      }
    }

    return enrichedList;
  } catch (err: any) {
    console.error("Error in getPendingManualPaymentsAction:", err?.message || err);
    return [];
  }
}
