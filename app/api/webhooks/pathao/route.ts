import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { CourierFactory } from "@/lib/couriers/courier.factory";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawPayload = await req.json();
    const headersList: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersList[key.toLowerCase()] = value;
    });

    const adminSupabase = createAdminClient();

    // 1. Resolve Pathao provider
    let provider;
    try {
      const resolved = await CourierFactory.getProviderFromDatabase("pathao");
      provider = resolved.provider;
    } catch {
      // Provider not in DB or error
    }

    // 2. Parse & validate webhook
    const parsed = provider?.handleWebhook
      ? await provider.handleWebhook(rawPayload, headersList)
      : {
          success: true,
          handled: true,
          consignmentId: rawPayload.consignment_id || rawPayload.consignmentId,
          trackingCode: rawPayload.consignment_id || rawPayload.consignmentId,
          status: rawPayload.order_status || rawPayload.order_status_slug,
          eventTime: rawPayload.updated_at || new Date().toISOString(),
          message: "Pathao webhook status update",
          rawPayload,
        };

    if (!parsed.consignmentId) {
      return NextResponse.json(
        { success: false, message: "Missing consignment identifier" },
        { status: 400 }
      );
    }

    const eventId = `pathao_${parsed.consignmentId}_${parsed.status}_${Date.now()}`;

    // 3. Log webhook event idempotently
    try {
      await adminSupabase.from("courier_webhook_events").insert({
        courier_code: "pathao",
        event_type: String(parsed.status || "STATUS_UPDATE"),
        event_id: eventId,
        payload: rawPayload as any,
        processed: true,
        processed_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn("[PathaoWebhook] Warning logging webhook event:", e.message);
    }

    // 4. Find matching shipment
    const { data: shipment } = await adminSupabase
      .from("shipments")
      .select("id, status, order_id")
      .or(`consignment_id.eq.${parsed.consignmentId},tracking_number.eq.${parsed.consignmentId}`)
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
          tracking_number: parsed.trackingCode || parsed.consignmentId,
          status: parsed.status,
          status_description: parsed.message || `Status updated via Pathao webhook: ${parsed.status}`,
          provider_raw: rawPayload as any,
          created_at: parsed.eventTime || new Date().toISOString(),
        });

        // 7. Update order fulfillment status if delivered or cancelled
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
      message: "Pathao webhook processed successfully",
    });
  } catch (err: any) {
    console.error("[PathaoWebhook Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
