import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { SSLCommerzService } from "@/lib/services/payment/sslcommerz.service";
import { CartService } from "@/lib/services/cart.service";
import { CouponService } from "@/services/coupon.service";

export const dynamic = "force-dynamic";

/**
 * SSLCommerz IPN (Instant Payment Notification) Webhook Endpoint
 * Server-to-server notification sent asynchronously by SSLCommerz.
 * Must validate the transaction with validationserverAPI.php, verify amount/currency,
 * and update order/inventory states idempotently.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        payload[key] = typeof value === "string" ? value : String(value);
      }
    } else if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      const urlParams = new URLSearchParams(text);
      for (const [key, value] of urlParams.entries()) {
        payload[key] = value;
      }
    }

    const valId = payload.val_id;
    const tranId = payload.tran_id;
    const status = (payload.status || "").toUpperCase();

    if (!valId || !tranId) {
      console.error("[SSLCommerz IPN] Missing val_id or tran_id in payload:", payload);
      return NextResponse.json(
        { error: "Missing required parameters (val_id, tran_id)" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Locate Order and Payment Session
    let order: any = null;
    let paymentSession: any = null;

    if (payload.value_a) {
      const { data: orderById } = await supabase
        .from("orders")
        .select("*")
        .eq("id", payload.value_a)
        .maybeSingle();
      if (orderById) order = orderById;
    }

    if (!order && tranId) {
      const { data: sessionData } = await supabase
        .from("payment_sessions")
        .select("*, orders(*)")
        .filter("metadata->>tran_id", "eq", tranId)
        .maybeSingle();

      if (sessionData) {
        paymentSession = sessionData;
        order = sessionData.orders;
      }
    }

    if (!order && tranId) {
      const { data: orderByIntent } = await supabase
        .from("orders")
        .select("*")
        .or(`payment_intent_id.eq.${tranId},order_number.eq.${tranId}`)
        .maybeSingle();

      if (orderByIntent) order = orderByIntent;
    }

    if (!order) {
      console.error(`[SSLCommerz IPN] Order not found for tran_id: ${tranId}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Idempotency Guard: If order is already paid/confirmed, acknowledge immediately
    const isAlreadyPaid =
      order.status === "CONFIRMED" ||
      order.status === "PROCESSING" ||
      order.status === "confirmed" ||
      order.status === "processing" ||
      order.payment_status === "CAPTURED";

    if (isAlreadyPaid) {
      return NextResponse.json({
        status: "ALREADY_PROCESSED",
        message: "Payment has already been processed and order confirmed",
        orderId: order.id,
      });
    }

    // Helper for safe rollback
    const safeRollback = async () => {
      try {
        await supabase.rpc("release_order_inventory", { p_order_id: order.id });
      } catch (_) {}
      try {
        await CouponService.releaseCoupon(order.id);
      } catch (_) {}
    };

    // 3. Handle Failure or Cancellation notifications from IPN
    if (status === "FAILED" || status === "CANCELLED") {
      console.warn(`[SSLCommerz IPN] Received ${status} notification for order ${order.order_number}`);

      await safeRollback();

      await supabase
        .from("orders")
        .update({ status: "cancelled", payment_status: "FAILED" })
        .eq("id", order.id);

      if (paymentSession?.id) {
        await supabase
          .from("payment_sessions")
          .update({ status: status.toLowerCase() })
          .eq("id", paymentSession.id);
      }

      return NextResponse.json({
        status: "ACKNOWLEDGED",
        message: `Order marked as ${status.toLowerCase()}`,
      });
    }

    // 4. Authoritative Server-Side Validation via official validationserverAPI.php
    const valRes = await SSLCommerzService.validateTransaction(valId, tranId);

    if (valRes.status !== "VALID" && valRes.status !== "VALIDATED") {
      console.error(
        `[SSLCommerz IPN] Transaction validation failed for order ${order.order_number}:`,
        valRes.status
      );

      await safeRollback();

      await supabase
        .from("orders")
        .update({ status: "cancelled", payment_status: "FAILED" })
        .eq("id", order.id);

      return NextResponse.json(
        { error: "Validation server rejected transaction" },
        { status: 400 }
      );
    }

    // Authoritative Amount Verification
    const gatewayAmount = parseFloat(valRes.amount);
    const orderAmount = parseFloat(order.total_amount ?? order.grand_total ?? 0);
    if (isNaN(gatewayAmount) || Math.abs(gatewayAmount - orderAmount) > 0.01) {
      console.error(
        `[SSLCommerz IPN] Amount mismatch! Gateway: ${valRes.amount}, Order: ${orderAmount}`
      );

      await safeRollback();

      await supabase
        .from("orders")
        .update({ status: "cancelled", payment_status: "FAILED" })
        .eq("id", order.id);

      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Authoritative Currency Verification
    const verifiedCurrency = (valRes.currency || "").toUpperCase();
    const expectedCurrency = (order.currency || "BDT").toUpperCase();
    const isCurrencyMatch =
      verifiedCurrency === expectedCurrency ||
      (verifiedCurrency === "BDT" && (expectedCurrency === "USD" || expectedCurrency === "BDT"));

    if (!isCurrencyMatch) {
      console.error(
        `[SSLCommerz IPN] Currency mismatch! Gateway: ${verifiedCurrency}, Order: ${expectedCurrency}`
      );

      await safeRollback();

      await supabase
        .from("orders")
        .update({ status: "cancelled", payment_status: "FAILED" })
        .eq("id", order.id);

      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
    }

    const confirmedTrxId = valRes.bank_tran_id || valId;
    const nowIso = new Date().toISOString();

    const { data: provider } = await supabase
      .from("payment_providers")
      .select("id")
      .eq("code", "sslcommerz")
      .maybeSingle();

    // 5. Update Payment Transactions (Idempotent)
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
        `[SSLCommerz IPN] Payment verified for order ${order.order_number}, but order is already CANCELLED. Setting payment_status to REFUND_PENDING.`
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
        notes: `Late IPN captured TrxID ${confirmedTrxId} for cancelled order. Marked for refund.`,
        created_by: order.customer_id || order.user_id || null,
      });

      return NextResponse.json({
        status: "ORDER_ALREADY_CANCELLED",
        message: "Payment captured for cancelled order. Order remains cancelled and marked for refund.",
        trxID: confirmedTrxId,
      });
    }

    // Update order status to confirmed
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

    // Record order status history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "confirmed",
      notes: `Paid successfully via SSLCommerz IPN (${valRes.card_type || "Cards/Mobile Banking"}). TrxID: ${confirmedTrxId}, ValID: ${valId}`,
      created_by: order.customer_id || order.user_id || null,
    });

    // Authoritative Admin Notification for captured payment via IPN
    try {
      const { createOrderNotificationAction } = await import("@/actions/admin/notification.actions");
      await createOrderNotificationAction({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: (order as any).customer_name || "Online Customer",
        amount: order.total_amount ?? order.grand_total,
        paymentMethod: "SSLCOMMERZ (IPN)",
        status: "confirmed",
      });
    } catch (notifErr) {
      console.warn("[SSLCommerz IPN] Error creating payment notification:", notifErr);
    }

    // Clear cart
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
      console.error("[SSLCommerz IPN] Cart clear error:", cartErr);
    }

    // Trigger Order Confirmation SMS asynchronously
    try {
      const { AlphaSmsService } = await import("@/lib/services/sms/alpha-sms.service");
      AlphaSmsService.triggerOrderConfirmationSmsAsync(order.id);
    } catch (smsErr) {
      console.error("[SSLCommerz IPN] SMS trigger error:", smsErr);
    }

    return NextResponse.json({
      status: "SUCCESS",
      message: "IPN verified and payment processed successfully",
      trxID: confirmedTrxId,
    });
  } catch (error: any) {
    console.error("[SSLCommerz IPN] Unexpected exception:", error);
    return NextResponse.json(
      { error: "Internal server error processing IPN", details: error.message },
      { status: 500 }
    );
  }
}
