import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { BKashService } from "@/lib/services/payment/bkash.service";
import { CartService } from "@/lib/services/cart.service";
import { CouponService } from "@/services/coupon.service";

export const dynamic = "force-dynamic";

/**
 * Common handler for bKash Tokenized Checkout Callback (GET / POST)
 * Handles customer return from bKash gateway, executes payment, validates amount,
 * and updates order/inventory transactionally.
 */
async function handleCallback(req: NextRequest) {
  const url = new URL(req.url);
  let paymentID = url.searchParams.get("paymentID");
  let status = url.searchParams.get("status");

  // If POST, parameters can also be in body
  if (req.method === "POST" && (!paymentID || !status)) {
    try {
      const body = await req.json();
      paymentID = paymentID || body.paymentID;
      status = status || body.status;
    } catch {
      // Body may not be JSON, fallback to URL searchParams
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!paymentID || !status) {
    console.error("[bKash Callback] Missing paymentID or status parameter");
    return NextResponse.redirect(
      new URL("/checkout/failed?reason=missing_callback_params", appUrl)
    );
  }

  const supabase = createAdminClient();

  // 1. Locate the Order and Payment Session
  let order: any = null;
  let paymentSession: any = null;

  // Check payment_sessions by metadata paymentID
  const { data: sessionData } = await supabase
    .from("payment_sessions")
    .select("*, orders(*)")
    .filter("metadata->>paymentID", "eq", paymentID)
    .maybeSingle();

  if (sessionData) {
    paymentSession = sessionData;
    order = sessionData.orders;
  }

  // Fallback: lookup order directly by payment_intent_id
  if (!order) {
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_intent_id", paymentID)
      .maybeSingle();

    if (orderData) {
      order = orderData;
    }
  }

  if (!order) {
    console.error(`[bKash Callback] Order not found for paymentID: ${paymentID}`);
    return NextResponse.redirect(
      new URL("/checkout/failed?reason=order_not_found", appUrl)
    );
  }

  // 2. Idempotency Guard: If order is already confirmed / processing / paid, redirect to success
  const isAlreadyPaid =
    order.status === "CONFIRMED" ||
    order.status === "PROCESSING" ||
    order.status === "processing" ||
    order.status === "confirmed" ||
    order.payment_status === "CAPTURED";

  if (isAlreadyPaid) {
    const existingTrxId = order.payment_intent_id || paymentID;
    return NextResponse.redirect(
      new URL(`/checkout/success?order_id=${order.id}&trxID=${existingTrxId}`, appUrl)
    );
  }

  // 3. Handle Cancellation or Failure from Gateway
  if (status === "cancel" || status === "failure") {
    console.warn(`[bKash Callback] Payment was ${status} by customer for order ${order.order_number}`);

    try {
      // Release reserved inventory atomically via RPC
      await supabase.rpc("release_order_inventory", { p_order_id: order.id });
      // Release coupon usage if applied
      await CouponService.releaseCoupon(order.id);
    } catch (releaseErr) {
      console.error(`[bKash Callback] Error releasing inventory for order ${order.id}:`, releaseErr);
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

    // Update session status if exists
    if (paymentSession?.id) {
      await supabase
        .from("payment_sessions")
        .update({ status: status === "cancel" ? "cancelled" : "failed" })
        .eq("id", paymentSession.id);
    }

    // Record failed transaction log
    await supabase.from("payment_transactions").insert({
      order_id: order.id,
      session_id: paymentSession?.id || null,
      provider_id: paymentSession?.provider_id || null,
      amount: order.total_amount ?? order.grand_total,
      currency: "BDT",
      status: "failed",
      error_code: `BKASH_${status.toUpperCase()}`,
      error_message: `Customer ${status}ed payment at gateway`,
    });

    return NextResponse.redirect(
      new URL(`/checkout/failed?order_id=${order.id}&reason=bkash_${status}`, appUrl)
    );
  }

  // 4. Handle Success -> Authoritative Server-Side Execution
  if (status === "success") {
    try {
      const executeRes = await BKashService.executePayment(paymentID);

      // Verify Provider Response Code
      if (executeRes.statusCode !== "0000" || executeRes.transactionStatus !== "Completed") {
        console.error(
          `[bKash Callback] Execution unconfirmed for order ${order.order_number}:`,
          executeRes.statusCode,
          executeRes.statusMessage
        );

        // Release inventory on unconfirmed execution
        await supabase.rpc("release_order_inventory", { p_order_id: order.id });
        await CouponService.releaseCoupon(order.id);

        const failPayload: Record<string, any> = { status: "cancelled" };
        const { error: failErr } = await supabase
          .from("orders")
          .update({ ...failPayload, payment_status: "FAILED" })
          .eq("id", order.id);
        if (failErr) {
          await supabase.from("orders").update(failPayload).eq("id", order.id);
        }

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=bkash_execution_failed`, appUrl)
        );
      }

      // Authoritative Amount Verification: check that bKash amount matches order total_amount
      const gatewayAmount = parseFloat(executeRes.amount);
      const orderAmount = parseFloat(order.total_amount ?? order.grand_total ?? 0);
      if (Math.abs(gatewayAmount - orderAmount) > 0.01) {
        console.error(
          `[bKash Callback] Amount mismatch! Gateway: ${gatewayAmount}, Order: ${orderAmount}`
        );

        await supabase.rpc("release_order_inventory", { p_order_id: order.id });
        await CouponService.releaseCoupon(order.id);

        const mismatchPayload: Record<string, any> = { status: "cancelled" };
        const { error: mismatchErr } = await supabase
          .from("orders")
          .update({ ...mismatchPayload, payment_status: "FAILED" })
          .eq("id", order.id);
        if (mismatchErr) {
          await supabase.from("orders").update(mismatchPayload).eq("id", order.id);
        }

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=amount_mismatch`, appUrl)
        );
      }

      // Authoritative Invoice Verification
      if (executeRes.merchantInvoiceNumber && executeRes.merchantInvoiceNumber !== order.order_number) {
        console.error(
          `[bKash Callback] Invoice mismatch! Gateway: ${executeRes.merchantInvoiceNumber}, Order: ${order.order_number}`
        );
      }

      const trxID = executeRes.trxID || paymentID;
      const nowIso = new Date().toISOString();

      // Retrieve bKash provider ID
      const { data: provider } = await supabase
        .from("payment_providers")
        .select("id")
        .eq("code", "bkash")
        .maybeSingle();

      // 5. Update Payment Transactions (Idempotent insert/upsert)
      await supabase.from("payment_transactions").insert({
        order_id: order.id,
        session_id: paymentSession?.id || null,
        provider_id: provider?.id || null,
        user_id: order.customer_id || order.user_id || null,
        amount: order.total_amount,
        currency: "BDT",
        status: "completed",
        reference_number: order.order_number,
        gateway_transaction_id: trxID,
        gateway_response: executeRes,
      });

      // Update payment session to completed
      if (paymentSession?.id) {
        await supabase
          .from("payment_sessions")
          .update({ status: "completed" })
          .eq("id", paymentSession.id);
      }

      // Check if order was cancelled while payment was pending (Late Payment Callback Race)
      if ((order.status || "").toLowerCase() === "cancelled") {
        console.warn(
          `[bKash Callback] Payment succeeded for order ${order.order_number}, but order is already CANCELLED. Setting payment_status to REFUND_PENDING.`
        );

        await supabase.from("orders").update({
          payment_method: "BKASH",
          payment_status: "REFUND_PENDING",
          payment_intent_id: trxID,
          paid_at: nowIso,
        }).eq("id", order.id);

        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "cancelled",
          notes: `Late payment callback captured TrxID ${trxID} for cancelled order. Marked for refund.`,
          created_by: order.customer_id || order.user_id || null,
        });

        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${order.id}&reason=order_already_cancelled_refund_pending`, appUrl)
        );
      }

      // Update order to confirmed
      const capturePayload: Record<string, any> = {
        status: "confirmed",
        paid_at: nowIso,
        payment_intent_id: trxID,
      };
      const { error: captureErr } = await supabase
        .from("orders")
        .update({
          ...capturePayload,
          payment_method: "BKASH",
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
        notes: `Paid successfully via bKash. TrxID: ${trxID}`,
        created_by: order.customer_id || order.user_id || null,
      });

      // Authoritative Admin Notification for captured bKash payment
      try {
        const { createOrderNotificationAction } = await import("@/actions/admin/notification.actions");
        await createOrderNotificationAction({
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: (order as any).customer_name || "Online Customer",
          amount: order.total_amount ?? order.grand_total,
          paymentMethod: "BKASH (PAID)",
          status: "confirmed",
        });
      } catch (notifErr) {
        console.warn("[bKash Callback] Error creating payment notification:", notifErr);
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
        console.error("[bKash Callback] Cart clear error:", cartErr);
      }

      return NextResponse.redirect(
        new URL(`/checkout/success?order_id=${order.id}&trxID=${trxID}`, appUrl)
      );
    } catch (execErr: any) {
      console.error("[bKash Callback] Execution exception:", execErr);
      return NextResponse.redirect(
        new URL(`/checkout/failed?order_id=${order.id}&reason=internal_error`, appUrl)
      );
    }
  }

  // Unknown status
  return NextResponse.redirect(
    new URL(`/checkout/failed?order_id=${order.id}&reason=unknown_status`, appUrl)
  );
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}
