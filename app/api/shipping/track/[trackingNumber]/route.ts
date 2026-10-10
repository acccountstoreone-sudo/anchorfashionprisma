import { NextResponse } from "next/server";
import { TrackingService } from "@/services/shipping/tracking.service";

/**
 * GET /api/shipping/track/[trackingNumber]
 * Public tracking endpoint — no authentication required.
 * Used by the customer tracking page.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params;

  if (!trackingNumber || trackingNumber.length < 3) {
    return NextResponse.json(
      { error: "Invalid tracking number" },
      { status: 400 }
    );
  }

  try {
    const trackingService = new TrackingService();
    const timeline = await trackingService.getTrackingTimeline(
      trackingNumber,
      "tracking_number"
    );

    if (!timeline) {
      return NextResponse.json(
        { error: "Tracking information not found for this number" },
        { status: 404 }
      );
    }

    // Cache for 2 minutes — short TTL for near-real-time tracking
    return NextResponse.json(
      { success: true, data: timeline },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    console.error("[Tracking API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
