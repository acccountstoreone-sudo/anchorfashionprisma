import { NextResponse } from "next/server";
import { CourierGatewayService } from "@/services/courier/courier-gateway.service";
import { ShippingService } from "@/services/shipping/shipping.service";
import { CourierProviderCode } from "@/types/shipping.types";

/**
 * POST /api/webhooks/courier/[provider]
 * Provider-specific webhook endpoint for courier status updates.
 * Each provider has its own URL so they can be configured separately.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const providerCode = provider as CourierProviderCode;

  try {
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

    // Normalize event via provider-specific processing
    const result = await CourierGatewayService.processWebhook(
      providerCode,
      payload,
      signature
    );

    if (!result.success) {
      console.error(
        `[Webhook:${providerCode}] Processing failed:`,
        result.error
      );
      return NextResponse.json(
        { error: result.error?.message },
        { status: 400 }
      );
    }

    if (result.data) {
      // Update shipment in the database
      const shippingService = new ShippingService();
      await shippingService.processWebhookEvent(result.data, providerCode);
    }

    return NextResponse.json({ received: true, provider: providerCode });
  } catch (err: any) {
    console.error(`[Webhook:${providerCode}] Unexpected error:`, err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
