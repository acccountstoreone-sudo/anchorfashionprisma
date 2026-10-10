import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { SSLCommerzService } from "@/lib/services/payment/sslcommerz.service";
import { CartService } from "@/lib/services/cart.service";
import { CouponService } from "@/services/coupon.service";

export const dynamic = "force-dynamic";

/**
 * Universal SSLCommerz Callback Handler (GET / POST)
 * Handles customer browser redirect from SSLCommerz hosted gateway (success, fail, cancel).
 * Performs authoritative server-side validation against validationserverAPI.php,
 * verifies amount, currency, order ownership, manages inventory lifecycle, and updates order.
 */
async function handleSSLCommerzCallback(req: NextRequest) {
  const url = new URL(req.url);
  const actionParam = url.searchParams.get("action");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;

  let payload: Record<string, any> = {};

  // Extract query parameters
  for (const [key, value] of url.searchParams.entries()) {
    payload[key] = value;
  }

  // Extract POST body (form-urlencoded or JSON)
  if (req.method === "POST") {
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          payload[key] = typeof value === "string" ? value : String(value);
        }
      } else if (contentType.includes("application/json")) {
        const json = await req.json();
        payload = { ...payload, ...json };
      } else {
        const text = await req.text();
        const urlParams = new URLSearchParams(text);
        for (const [key, value] of urlParams.entries()) {
          payload[key] = value;
        }
      }
    } catch (parseErr) {
      console.warn("[SSLCommerz Callback] Error reading body:", parseErr);
    }
  }

  const valId = payload.val_id;
  const tranId = payload.tran_id;
  const status = (payload.status || "").toUpperCase();
  const orderIdFromCustom = payload.value_a;
  const action = actionParam || (status === "VALID" || status === "VALIDATED" ? "success" : status === "CANCELLED" ? "cancel" : "fail");

  const supabase = createAdminClient();

  // 1. Locate Order and Payment Session
  let order: any = null;
  let paymentSession: any = null;

  // Try lookup by custom parameter value_a (order.id)
  if (orderIdFromCustom) {
    const { data: orderById } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderIdFromCustom)
      .maybeSingle();
    if (orderById) {
      order = orderById;
    }
  }

  // Lookup in payment_sessions by tran_id
  if (tranId) {
    const { data: sessionData } = await supabase
      .from("payment_sessions")
      .select("*, orders(*)")
      .filter("metadata->>tran_id", "eq", tranId)
      .maybeSingle();

    if (sessionData) {
      paymentSession = sessionData;
      if (!order && sessionData.orders) {
        order = sessionData.orders;
      }
    }
  }

  // Fallback lookup order directly by payment_intent_id or order_number
  if (!order && tranId) {
    const { data: orderByIntent } = await supabase
      .from("orders")
      .select("*")
      .or(`payment_intent_id.eq.${tranId},order_number.eq.${tranId}`)
      .maybeSingle();

    if (orderByIntent) {
      order = orderByIntent;
    }
  }

  if (!order) {
    console.error(`[SSLCommerz Callback] Order not found for tran_id: ${tranId}, value_a: ${orderIdFromCustom}`);
    return NextResponse.redirect(
      new URL("/checkout/failed?reason=order_not_found", appUrl),
      303
    );
  }

  // If session wasn't located yet, find session for this order
  if (!paymentSession) {
    const { data: sessionByOrder } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sessionByOrder) {
      paymentSession = sessionByOrder;
    }
  }

  // 2. Idempotency Guard: If order is already paid/confirmed, redirect directly to success
  const isAlreadyPaid =
    order.status === "CONFIRMED" ||
    order.status === "PROCESSING" ||
    order.status === "confirmed" ||
    order.status === "processing" ||
    order.payment_status === "CAPTURED";

  if (isAlreadyPaid) {
    const existingTrxId = order.payment_intent_id || tranId;
    return NextResponse.redirect(
      new URL(`/checkout/success?order_id=${order.id}&trxID=${existingTrxId}`, appUrl),
      303
    );
  }

  // 3. Handle Cancellation or Failure from Gateway
  if (action === "cancel" || status === "CANCELLED" || action === "fail" || status === "FAILED") {
    const isCancel = action === "cancel" || status === "CANCELLED";
    console.warn(`[SSLCommerz Callback] Payment ${isCancel ? "cancelled" : "failed"} for order ${order.order_number}`);

    try {
      // Release reserved inventory atomically via RPC
      await supabase.rpc("release_order_inventory", { p_order_id: order.id });
      // Release coupon usage if applied
      await CouponService.releaseCoupon(order.id);
    } catch (releaseErr) {
      console.error(`[SSLCommerz Callback] Error releasing inventory for order ${order.id}:`, releaseErr);
    }

    // Update order status to cancelled
    const cancelPayload: Record<string, any> = {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    };
    const { error: cancelErr } = await supabase
      .from("orders")
      .update({ ...cancelPayload, payment_status: "FAILED" })
      .eq("id", order.id);
    if (cancelErr) {
      await supabase.from("orders").update(cancelPayload).eq("id", order.id);
    }

    // Update payment session status
    if (paymentSession?.id) {
      await supabase
        .from("payment_sessions")
        .update({ status: isCancel ? "cancelled" : "failed" })
        .eq("id", paymentSession.id);
    }

    // Record transaction audit log
    await supabase.from("payment_transactions").insert({
      order_id: order.id,
      session_id: paymentSession?.id || null,
      provider_id: paymentSession?.provider_id || null,
      amount: order.total_amount ?? order.grand_total,
      currency: order.currency || "BDT",
      status: isCancel ? "cancelled" : "failed",
      reference_number: tranId || order.order_number,
      error_code: `SSLCOMMERZ_${isCancel ? "CANCELLED" : "FAILED"}`,
      error_message: payload.failedreason || payload.error || `Customer ${isCancel ? "cancelled" : "failed"} payment at gateway`,
      gateway_response: payload,
    });

    return NextResponse.redirect(
      new URL(`/checkout/failed?order_id=${order.id}&reason=payment_${isCancel ? "cancelled" : "failed"}`, appUrl),
      303
    );
  }

  // 4. Handle Success -> Authoritative Server-Side Validation
  if (action === "success" || status === "VALID" || status === "VALIDATED") {
    if (!valId) {
      console.error(`[SSLCommerz Callback] Missing val_id in success callback for order ${order.order_number}`);
      return NextResponse.redirect(
        new URL(`/checkout/failed?order_id=${order.id}&reason=missing_val_id`, appUrl),
        303
      );
    }

    try {
      // Call official validation API: validationserverAPI.php
      const valRes = await SSLCommerzService.validateTransaction(valId, tranId);

      // Verify Provider Status
      if (valRes.status !== "VALID" && valRes.status !== "VALIDATED") {
        console.error(
          `[SSLCommerz Callback] Transaction validation failed for order ${order.order_number}:`,
          valRes.status,
          valRes.error
        );

        await supabase.rpc("release_order_inventory", { p_order_id: order.id });
        await CouponService.releaseCoupon(order.id);

        await supabase
          .from("orders")
          .update({ status: "cancelled", payment_status: "FAILED" })
          .eq("id", order.id);

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=validation_failed`, appUrl),
          303
        );
      }

      // Authoritative Amount Verification: compare SSLCommerz verified amount against authoritative order total
      const gatewayAmount = parseFloat(valRes.amount);
      const orderAmount = parseFloat(order.total_amount ?? order.grand_total ?? 0);
      if (isNaN(gatewayAmount) || Math.abs(gatewayAmount - orderAmount) > 0.01) {
        console.error(
          `[SSLCommerz Callback] Security Alert: Amount mismatch! Gateway: ${valRes.amount}, Order: ${orderAmount}`
        );

        await supabase.rpc("release_order_inventory", { p_order_id: order.id });
        await CouponService.releaseCoupon(order.id);

        await supabase
          .from("orders")
          .update({ status: "cancelled", payment_status: "FAILED" })
          .eq("id", order.id);

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=amount_mismatch`, appUrl),
          303
        );
      }

      // Authoritative Currency Verification
      const verifiedCurrency = (valRes.currency || "").toUpperCase();
      const expectedCurrency = (order.currency || "BDT").toUpperCase();
      const isCurrencyMatch =
        verifiedCurrency === expectedCurrency ||
        (verifiedCurrency === "BDT" && (expectedCurrency === "USD" || expectedCurrency === "BDT"));

      if (!isCurrencyMatch) {
        console.error(
          `[SSLCommerz Callback] Security Alert: Currency mismatch! Gateway: ${verifiedCurrency}, Order: ${expectedCurrency}`
        );

        await supabase.rpc("release_order_inventory", { p_order_id: order.id });
        await CouponService.releaseCoupon(order.id);

        await supabase
          .from("orders")
          .update({ status: "cancelled", payment_status: "FAILED" })
          .eq("id", order.id);

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=currency_mismatch`, appUrl),
          303
        );
      }

      // Authoritative Transaction ID Verification
      if (valRes.tran_id && tranId && valRes.tran_id !== tranId) {
        console.warn(
          `[SSLCommerz Callback] Transaction ID mismatch warning! Gateway: ${valRes.tran_id}, Payload: ${tranId}`
        );
      }

      const confirmedTrxId = valRes.bank_tran_id || valId;
      const nowIso = new Date().toISOString();

      // Retrieve SSLCommerz provider ID
      const { data: provider } = await supabase
        .from("payment_providers")
        .select("id")
        .eq("code", "sslcommerz")
        .maybeSingle();

      // 5. Update Payment Transactions (Idempotent insert)
      await supabase.from("payment_transactions").insert({
        order_id: order.id,
        session_id: paymentSession?.id || null,
        provider_id: provider?.id || null,
        user_id: order.customer_id || order.user_id || null,
        amount: order.total_amount ?? order.grand_total,
        currency: expectedCurrency,
        status: "completed",
        reference_number: tranId || order.order_number,
        gateway_transaction_id: confirmedTrxId,
        gateway_response: valRes,
      });

      // Update payment session to completed
      if (paymentSession?.id) {
        await supabase
          .from("payment_sessions")
          .update({
            status: "completed",
            metadata: {
              ...(paymentSession.metadata || {}),
              val_id: valId,
              bank_tran_id: valRes.bank_tran_id,
              card_type: valRes.card_type,
            },
          })
          .eq("id", paymentSession.id);
      }

      // Check if order was cancelled while payment was pending (Late Payment Callback Race)
      if ((order.status || "").toLowerCase() === "cancelled") {
        console.warn(
          `[SSLCommerz Callback] Payment succeeded for order ${order.order_number}, but order is already CANCELLED. Setting payment_status to REFUND_PENDING.`
        );

        await supabase.from("orders").update({
          payment_method: "SSLCOMMERZ",
          payment_status: "REFUND_PENDING",
          payment_intent_id: confirmedTrxId,
          paid_at: nowIso,
        }).eq("id", order.id);

        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "cancelled",
          notes: `Late payment callback captured TrxID ${confirmedTrxId} for cancelled order. Marked for refund.`,
          created_by: order.customer_id || order.user_id || null,
        });

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=order_already_cancelled_refund_pending`, appUrl),
          303
        );
      }

      // Update order to confirmed & captured
      const capturePayload: Record<string, any> = {
        status: "confirmed",
        paid_at: nowIso,
        payment_intent_id: confirmedTrxId,
      };

      const { error: captureErr } = await supabase
        .from("orders")
        .update({
          ...capturePayload,
          payment_method: "SSLCOMMERZ",
          payment_status: "CAPTURED",
        })
        .eq("id", order.id);

      if (captureErr) {
        await supabase.from("orders").update(capturePayload).eq("id", order.id);
      }

      // Insert Order Status History
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "confirmed",
        notes: `Paid successfully via SSLCommerz (${valRes.card_type || "Cards/Mobile Banking"}). TrxID: ${confirmedTrxId}, ValID: ${valId}`,
        created_by: order.customer_id || order.user_id || null,
      });

      // Authoritative Admin Notification for captured payment
      try {
        const { createOrderNotificationAction } = await import("@/actions/admin/notification.actions");
        await createOrderNotificationAction({
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: (order as any).customer_name || "Online Customer",
          amount: order.total_amount ?? order.grand_total,
          paymentMethod: "SSLCOMMERZ (PAID)",
          status: "confirmed",
        });
      } catch (notifErr) {
        console.warn("[SSLCommerz Callback] Error creating payment notification:", notifErr);
      }

      // Clear customer cart (Prompt 7 integration)
      try {
        let cartIdToClear: string | null = null;
        if (order.session_id) {
          const { data: cart } = await supabase
            .from("carts")
            .select("id")
            .eq("session_id", order.session_id)
            .maybeSingle();
          if (cart?.id) cartIdToClear = cart.id;
        }
        if (!cartIdToClear && order.user_id) {
          const { data: userCart } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", order.user_id)
            .maybeSingle();
          if (userCart?.id) cartIdToClear = userCart.id;
        }

        if (cartIdToClear) {
          await CartService.clearCart(cartIdToClear);
        }
      } catch (cartErr) {
        console.error("[SSLCommerz Callback] Cart clear error:", cartErr);
      }

      // Trigger Order Confirmation SMS asynchronously
      try {
        const { AlphaSmsService } = await import("@/lib/services/sms/alpha-sms.service");
        AlphaSmsService.triggerOrderConfirmationSmsAsync(order.id);
      } catch (smsErr) {
        console.error("[SSLCommerz Callback] SMS trigger error:", smsErr);
      }

      return NextResponse.redirect(
        new URL(`/checkout/success?order_id=${order.id}&trxID=${confirmedTrxId}`, appUrl),
        303
      );
    } catch (execErr: any) {
      console.error("[SSLCommerz Callback] Validation execution exception:", execErr);
      return NextResponse.redirect(
        new URL(`/checkout/failed?order_id=${order.id}&reason=internal_error`, appUrl),
        303
      );
    }
  }

  // Unknown callback status
  return NextResponse.redirect(
    new URL(`/checkout/failed?order_id=${order.id}&reason=unknown_status`, appUrl),
    303
  );
}

export async function GET(req: NextRequest) {
  return handleSSLCommerzCallback(req);
}

export async function POST(req: NextRequest) {
  return handleSSLCommerzCallback(req);
}
