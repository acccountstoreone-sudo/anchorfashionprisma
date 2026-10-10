import { NextResponse } from "next/server";
import { CourierGatewayService } from "@/services/courier/courier-gateway.service";
import { ShippingService } from "@/services/shipping/shipping.service";
import { CourierProviderCode } from "@/types/shipping.types";

/**
 * POST /api/webhooks/courier
 * Generic courier webhook. Provider determined via ?provider= query param.
 * Kept for backwards compatibility with older configurations.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get(
      "provider"
    ) as CourierProviderCode | null;

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "Provider not specified. Use ?provider=steadfast or /api/webhooks/courier/[provider]",
        },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    const signature =
      req.headers.get("x-signature") ||
      req.headers.get("x-hmac-signature") ||
      req.headers.get("x-provider-signature") ||
      "";

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const result = await CourierGatewayService.processWebhook(
      provider,
      payload,
      signature
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message },
        { status: 400 }
      );
    }

    if (result.data) {
      const shippingService = new ShippingService();
      await shippingService.processWebhookEvent(result.data, provider);
    }

    return NextResponse.json({ received: true, provider });
  } catch (err: any) {
    console.error("[Courier Webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
