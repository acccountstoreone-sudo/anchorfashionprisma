import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { BKashService } from "@/lib/services/payment/bkash.service";
import { SSLCommerzService } from "@/lib/services/payment/sslcommerz.service";

/**
 * Payment Initialization Endpoint
 *
 * This endpoint is called after an order is placed with a digital payment method (bKash, SSLCommerz).
 * It retrieves the order details, fetches the relevant payment gateway credentials from the
 * settings table, and redirects the customer to the payment provider's hosted page.
 *
 * Flow:
 *   POST /checkout -> processCheckoutAction -> order created -> redirect to /api/payment/init
 *   /api/payment/init -> fetch order + credentials -> redirect to gateway
 *   Gateway -> customer pays -> callback/webhook -> verify & capture -> update order status
 *   Gateway -> redirect to /checkout/success or /checkout/failed
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");
  const method = url.searchParams.get("method");

  if (!orderId || !method) {
    return NextResponse.redirect(
      new URL("/checkout/failed?reason=missing_params", req.url)
    );
  }

  const supabase = createAdminClient();
  try {
    // 1. Fetch the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, grand_total, customer_id, payment_method, status"
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(
        "[Payment Init] Order not found:",
        orderId,
        orderError?.message
      );
      return NextResponse.redirect(
        new URL("/checkout/failed?reason=order_not_found", req.url)
      );
    }

    // Fetch address details for accurate customer phone, name, email
    const { data: shippingAddr } = await supabase
      .from("order_addresses")
      .select("*")
      .eq("order_id", order.id)
      .eq("address_type", "SHIPPING")
      .maybeSingle();

    const customerName = shippingAddr
      ? `${shippingAddr.first_name || ""} ${shippingAddr.last_name || ""}`.trim()
      : "Customer";
    const customerPhone = shippingAddr?.phone || "";
    const customerEmail = shippingAddr?.email || "";
    const totalAmount = Number(order.grand_total) || 0;

    // 2. Only process if the order is in PENDING_PAYMENT state
    if (order.status !== "PENDING" && order.status !== "PENDING_PAYMENT" && order.status !== "pending_payment") {
      // Already processed, redirect to success
      return NextResponse.redirect(
        new URL(`/checkout/success?order_id=${orderId}`, req.url)
      );
    }

    const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(req.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;

    // 3. Special handling for bKash Tokenized Checkout
    if (method.toUpperCase() === "BKASH") {
      const isConfigured = await BKashService.isConfigured();

      if (!isConfigured) {
        console.warn(
          "[Payment Init] bKash credentials not configured in environment or settings. Redirecting to success with notice."
        );
        return NextResponse.redirect(
          new URL(
            `/checkout/success?order_id=${orderId}&notice=payment_pending`,
            req.url
          )
        );
      }

      try {
        const paymentData = await BKashService.createPayment({
          orderId: order.id,
          orderNumber: order.order_number,
          amount: totalAmount,
          customerPhone: customerPhone,
          callbackUrl: `${appUrl}/api/payment/bkash/callback`,
        });

        // Store payment session & intent
        const { data: provider } = await supabase
          .from("payment_providers")
          .select("id")
          .eq("code", "bkash")
          .maybeSingle();

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        await supabase.from("payment_sessions").insert({
          provider_id: provider?.id || null,
          order_id: order.id,
          amount: totalAmount,
          currency: "BDT",
          status: "pending",
          gateway_url: paymentData.bkashURL,
          expires_at: expiresAt,
          metadata: {
            paymentID: paymentData.paymentID,
            orderNumber: order.order_number,
          },
        });

        await supabase
          .from("orders")
          .update({
            payment_intent_id: paymentData.paymentID,
            payment_method: "BKASH",
            payment_status: "PENDING",
          })
          .eq("id", order.id);

        return NextResponse.redirect(paymentData.bkashURL);
      } catch (bkashErr: any) {
        console.error("[Payment Init] bKash createPayment error:", bkashErr.message);
        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${orderId}&reason=bkash_init_failed`, req.url)
        );
      }
    }

    // 4. Special handling for SSLCommerz / Card payments
    const upperMethod = method.toUpperCase();
    if (
      upperMethod === "SSLCOMMERZ" ||
      upperMethod === "CARD" ||
      upperMethod === "VISA" ||
      upperMethod === "MASTERCARD"
    ) {
      const isConfigured = await SSLCommerzService.isConfigured();

      if (!isConfigured) {
        console.warn(
          "[Payment Init] SSLCommerz credentials not configured in environment or settings. Redirecting to success with notice."
        );
        return NextResponse.redirect(
          new URL(
            `/checkout/success?order_id=${orderId}&notice=payment_pending`,
            req.url
          )
        );
      }

      try {
        const tranId = `${order.order_number}-${Date.now().toString().slice(-6)}`;

        const paymentData = await SSLCommerzService.initiatePayment({
          orderId: order.id,
          orderNumber: order.order_number,
          tranId,
          amount: totalAmount,
          currency: "BDT",
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          customerAddress: shippingAddr?.address_line_1,
          customerCity: shippingAddr?.city,
          customerPostcode: shippingAddr?.postal_code,
          customerCountry: shippingAddr?.country || "Bangladesh",
          shippingName: customerName,
          shippingAddress: shippingAddr?.address_line_1,
          shippingCity: shippingAddr?.city,
          shippingPostcode: shippingAddr?.postal_code,
          shippingCountry: shippingAddr?.country || "Bangladesh",
          successUrl: `${appUrl}/api/payment/sslcommerz/callback?action=success`,
          failUrl: `${appUrl}/api/payment/sslcommerz/callback?action=fail`,
          cancelUrl: `${appUrl}/api/payment/sslcommerz/callback?action=cancel`,
          ipnUrl: `${appUrl}/api/payment/sslcommerz/ipn`,
        });

        // Store payment session & intent
        const { data: provider } = await supabase
          .from("payment_providers")
          .select("id")
          .eq("code", "sslcommerz")
          .maybeSingle();

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        await supabase.from("payment_sessions").insert({
          provider_id: provider?.id || null,
          order_id: order.id,
          amount: totalAmount,
          currency: "BDT",
          status: "pending",
          gateway_url: paymentData.GatewayPageURL,
          expires_at: expiresAt,
          metadata: {
            tran_id: tranId,
            sessionkey: paymentData.sessionkey,
            orderNumber: order.order_number,
          },
        });

        const updatePayload: Record<string, any> = {
          payment_intent_id: tranId,
        };
        const { error: updErr } = await supabase
          .from("orders")
          .update({
            ...updatePayload,
            payment_method: "SSLCOMMERZ",
            payment_status: "PENDING",
          })
          .eq("id", order.id);

        if (updErr) {
          await supabase.from("orders").update(updatePayload).eq("id", order.id);
        }

        return NextResponse.redirect(paymentData.GatewayPageURL!);
      } catch (sslErr: any) {
        console.error("[Payment Init] SSLCommerz initiatePayment error:", sslErr.message);
        return NextResponse.redirect(
          new URL(`/checkout/failed?order_id=${orderId}&reason=ssl_init_failed`, req.url)
        );
      }
    }

    // 5. Fetch gateway credentials for other methods (Stripe, PayPal, etc.)
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", `payment_${method.toLowerCase()}`)
      .single();

    const credentials = settingsRow?.value as Record<string, string> | null;

    if (!credentials) {
      console.error(
        `[Payment Init] No credentials configured for method: ${method}`
      );
      return NextResponse.redirect(
        new URL(
          `/checkout/success?order_id=${orderId}&notice=payment_pending`,
          req.url
        )
      );
    }

    if (method === "STRIPE") {
      const stripeRes = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.secret_key}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "payment_method_types[0]": "card",
            "line_items[0][price_data][currency]": "bdt",
            "line_items[0][price_data][product_data][name]": `Order ${order.order_number}`,
            "line_items[0][price_data][unit_amount]": Math.round(
              totalAmount * 100
            ).toString(),
            "line_items[0][quantity]": "1",
            mode: "payment",
            success_url: `${appUrl}/checkout/success?order_id=${order.id}`,
            cancel_url: `${appUrl}/checkout/failed?reason=cancelled`,
          }),
        }
      );

      const stripeData = await stripeRes.json();
      if (stripeData && stripeData.url) {
        return NextResponse.redirect(stripeData.url);
      }
      return NextResponse.redirect(
        new URL(`/checkout/failed?reason=stripe_init_failed`, req.url)
      );
    }

    if (method === "PAYPAL") {
      const paypalBase =
        credentials.sandbox === "true"
          ? "https://api-m.sandbox.paypal.com"
          : "https://api-m.paypal.com";
      const auth = Buffer.from(
        `${credentials.client_id}:${credentials.client_secret}`
      ).toString("base64");

      const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const { access_token } = await tokenRes.json();

      const orderRes = await fetch(`${paypalBase}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: (totalAmount / 110).toFixed(2),
              },
            },
          ],
          application_context: {
            return_url: `${appUrl}/checkout/success?order_id=${order.id}`,
            cancel_url: `${appUrl}/checkout/failed?reason=cancelled`,
          },
        }),
      });
      const paypalData = await orderRes.json();
      const approveLink = paypalData.links?.find(
        (link: any) => link.rel === "approve"
      );
      if (approveLink) {
        return NextResponse.redirect(approveLink.href);
      }
      return NextResponse.redirect(
        new URL(`/checkout/failed?reason=paypal_init_failed`, req.url)
      );
    }

    if (method === "NAGAD") {
      // Nagad requires RSA signature for real implementation which requires a dedicated crypto module
      // This is a boilerplate redirect until the crypto utility is ready.
      return NextResponse.redirect(
        new URL(
          `/checkout/success?order_id=${orderId}&notice=nagad_pending_crypto`,
          req.url
        )
      );
    }

    // Unknown method
    return NextResponse.redirect(
      new URL(`/checkout/failed?reason=unknown_method`, req.url)
    );
  } catch (error: any) {
    console.error("[Payment Init] Unexpected error:", error);
    return NextResponse.redirect(
      new URL("/checkout/failed?reason=server_error", req.url)
    );
  }
}
