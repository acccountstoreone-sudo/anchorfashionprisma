import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { CourierFactory } from "@/lib/couriers/courier.factory";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { shipmentId } = await params;
    const adminSupabase = createAdminClient();

    // 1. Fetch shipment
    const { data: shipment, error: shipError } = await adminSupabase
      .from("shipments")
      .select("*, order:order_id(order_number, id, grand_total, payment_method)")
      .eq("id", shipmentId)
      .maybeSingle();

    if (shipError || !shipment) {
      return NextResponse.json(
        { success: false, error: "Shipment not found" },
        { status: 404 }
      );
    }

    // 2. Fetch existing tracking events
    const { data: events } = await adminSupabase
      .from("shipment_tracking_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: true });

    // 3. Optional live sync from provider if consignment_id / tracking_number is present
    const url = new URL(req.url);
    const sync = url.searchParams.get("sync") === "true";

    if (sync && shipment.courier_provider_code && (shipment.consignment_id || shipment.tracking_number)) {
      try {
        const { provider } = await CourierFactory.getProviderFromDatabase(
          shipment.courier_provider_code
        );

        if (provider.isConfigured()) {
          const liveTracking = await provider.getTracking(
            shipment.consignment_id || shipment.tracking_number
          );

          if (liveTracking.currentStatusNormalized !== "unknown") {
            // Update shipment status if changed
            if (liveTracking.currentStatusNormalized !== shipment.status) {
              await adminSupabase
                .from("shipments")
                .update({
                  status: liveTracking.currentStatusNormalized,
                  provider_status: liveTracking.currentStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", shipment.id);
            }
          }
        }
      } catch (syncErr: any) {
        console.warn(`[TrackingSync] Could not sync with provider: ${syncErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        shipment,
        currentStatus: shipment.status,
        trackingCode: shipment.tracking_number || shipment.consignment_id,
        events: events || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch tracking" },
      { status: 500 }
    );
  }
}
