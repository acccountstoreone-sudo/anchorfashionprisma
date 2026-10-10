import { NextRequest, NextResponse } from "next/server";
import { paymentWebhookService } from "@/services/payment-webhook.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerCode } = await params;

  try {
    const rawBody = await req.text();
    let payload = {};

    // Try parse as JSON
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // If not JSON, try to parse form data
      const urlParams = new URLSearchParams(rawBody);
      payload = Object.fromEntries(urlParams.entries());
    }

    const headers = Object.fromEntries(req.headers.entries());

    const result = await paymentWebhookService.processWebhook(
      providerCode,
      payload,
      headers
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(`Webhook error [${providerCode}]:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
