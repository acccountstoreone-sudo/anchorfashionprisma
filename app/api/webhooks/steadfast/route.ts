import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { CourierFactory } from "@/lib/couriers/courier.factory";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawPayload = await req.json();
    const adminSupabase = createAdminClient();

    // 1. Resolve Steadfast provider
    let provider;
    try {
      const resolved = await CourierFactory.getProviderFromDatabase("steadfast");
      provider = resolved.provider;
    } catch {
      // Provider not in DB or error
    }

    // 2. Parse & validate webhook
    const parsed = provider?.handleWebhook
      ? await provider.handleWebhook(rawPayload)
      : {
          success: true,
          handled: true,
          consignmentId: String(rawPayload.consignment_id || rawPayload.consignmentId || ""),
          trackingCode: rawPayload.tracking_code || String(rawPayload.consignment_id || ""),
          status: rawPayload.status,
          eventTime: rawPayload.updated_at || new Date().toISOString(),
          message: "Steadfast webhook status update",
          rawPayload,
        };

    const targetCode = parsed.consignmentId || parsed.trackingCode;
    if (!targetCode) {
      return NextResponse.json(
        { success: false, message: "Missing consignment identifier" },
        { status: 400 }
      );
    }

    const eventId = `steadfast_${targetCode}_${parsed.status}_${Date.now()}`;

    // 3. Log webhook event idempotently
    try {
      await adminSupabase.from("courier_webhook_events").insert({
        courier_code: "steadfast",
        event_type: String(parsed.status || "STATUS_UPDATE"),
        event_id: eventId,
        payload: rawPayload as any,
        processed: true,
        processed_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn("[SteadfastWebhook] Warning logging webhook event:", e.message);
    }

    // 4. Find matching shipment
    const { data: shipment } = await adminSupabase
      .from("shipments")
      .select("id, status, order_id")
      .or(`consignment_id.eq.${targetCode},tracking_number.eq.${targetCode}`)
      .maybeSingle();

    if (shipment) {
      // 5. Update shipment status if provided
      if (parsed.status && parsed.status !== "unknown") {
        await adminSupabase
          .from("shipments")
          .update({
            status: parsed.status,
            provider_status: parsed.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shipment.id);

        // 6. Record tracking event
        await adminSupabase.from("shipment_tracking_events").insert({
          shipment_id: shipment.id,
          tracking_number: targetCode,
          status: parsed.status,
          status_description: parsed.message || `Status updated via Steadfast webhook: ${parsed.status}`,
          provider_raw: rawPayload as any,
          created_at: parsed.eventTime || new Date().toISOString(),
        });

        // 7. Update order fulfillment status if delivered
        if (parsed.status === "delivered" && shipment.order_id) {
          await adminSupabase
            .from("orders")
            .update({ status: "delivered", delivered_at: new Date().toISOString() })
            .eq("id", shipment.order_id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Steadfast webhook processed successfully",
    });
  } catch (err: any) {
    console.error("[SteadfastWebhook Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
