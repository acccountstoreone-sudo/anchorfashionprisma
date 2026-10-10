import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { CourierFactory } from "@/lib/couriers/courier.factory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 1. Cron authentication
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();

    // 2. Fetch active shipments needing synchronization
    const { data: activeShipments, error: fetchError } = await adminSupabase
      .from("shipments")
      .select("id, courier_provider_code, consignment_id, tracking_number, status, order_id")
      .in("status", ["pickup_requested", "picked_up", "in_transit", "out_for_delivery"])
      .not("courier_provider_code", "is", null)
      .limit(25);

    if (fetchError || !activeShipments || activeShipments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active shipments requiring courier synchronization",
        syncedCount: 0,
      });
    }

    let syncedCount = 0;
    const errors: Array<{ shipmentId: string; error: string }> = [];

    // Group shipments by courier code to reuse providers
    const providerCache = new Map<string, any>();

    for (const shipment of activeShipments) {
      const code = shipment.courier_provider_code;
      const trackingIdentifier = shipment.consignment_id || shipment.tracking_number;

      if (!code || !trackingIdentifier) continue;

      try {
        if (!providerCache.has(code)) {
          const { provider } = await CourierFactory.getProviderFromDatabase(code);
          providerCache.set(code, provider);
        }

        const provider = providerCache.get(code);
        if (!provider.isConfigured()) continue;

        const liveTracking = await provider.getTracking(trackingIdentifier);

        if (
          liveTracking.currentStatusNormalized !== "unknown" &&
          liveTracking.currentStatusNormalized !== shipment.status
        ) {
          // Update DB status
          await adminSupabase
            .from("shipments")
            .update({
              status: liveTracking.currentStatusNormalized,
              provider_status: liveTracking.currentStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", shipment.id);

          // Add tracking event
          await adminSupabase.from("shipment_tracking_events").insert({
            shipment_id: shipment.id,
            tracking_number: trackingIdentifier,
            status: liveTracking.currentStatusNormalized,
            status_description: `Status updated via scheduled courier sync: ${liveTracking.currentStatus}`,
            created_at: new Date().toISOString(),
          });

          // Update order if delivered
          if (liveTracking.currentStatusNormalized === "delivered" && shipment.order_id) {
            await adminSupabase
              .from("orders")
              .update({ status: "delivered", delivered_at: new Date().toISOString() })
              .eq("id", shipment.order_id);
          }

          syncedCount++;
        }
      } catch (err: any) {
        errors.push({ shipmentId: shipment.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      totalChecked: activeShipments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Courier sync cron error" },
      { status: 500 }
    );
  }
}
