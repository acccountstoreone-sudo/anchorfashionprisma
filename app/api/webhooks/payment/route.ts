import { NextResponse } from "next/server";
import { WebhookService } from "@/services/webhooks/webhook.service";
import { paymentWebhookService } from "@/services/payment-webhook.service";

export async function POST(req: Request) {
  try {
    const rawPayload = await req.text();
    const signature =
      req.headers.get("x-provider-signature") ||
      req.headers.get("stripe-signature");

    // In a real application, you'd extract the provider from the URL or headers
    // For this example, we'll assume a query param or header e.g. /api/webhooks/payment?provider=stripe
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not specified" },
        { status: 400 }
      );
    }

    // Ideally, we fetch the secret for this specific provider from config/DB here
    // For abstraction, we assume WebhookService handles this or we pass it
    const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

    if (!WebhookService.verifySignature(rawPayload, signature || '', secret || '')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawPayload);
    const headers = {}; // Mock headers

    // Delegate provider-specific webhook processing (e.g. normalizing payload)
    const result = await paymentWebhookService.processWebhook(
      provider,
      payload,
      headers
    );

    if (result.success) {
      // Enqueue the normalized event for async processing (e.g. updating order status)
      await WebhookService.enqueueIncomingWebhook(
        "PAYMENT",
        provider,
        result.data
      );
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json(
        { error: result.error?.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Payment webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
