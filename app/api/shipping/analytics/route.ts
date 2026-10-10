import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * GET /api/shipping/analytics
 * Shipping analytics data for the admin dashboard.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);
    const dateFrom = new Date(Date.now() - days * 86400_000).toISOString();

    const supabase = createAdminClient();

    const [statusCounts, courierCounts, dailyCounts, deliveryRate] =
      await Promise.all([
        // Status breakdown
        supabase.from("shipments").select("status").gte("created_at", dateFrom),

        // Per-courier breakdown
        supabase
          .from("shipments")
          .select("courier_provider_code, status")
          .gte("created_at", dateFrom)
          .not("courier_provider_code", "is", null),

        // Daily volume (last N days)
        supabase
          .from("shipments")
          .select("created_at, status")
          .gte("created_at", dateFrom)
          .order("created_at", { ascending: true }),

        // Overall delivery rate
        supabase
          .from("shipments")
          .select("status")
          .gte("created_at", dateFrom)
          .in("status", ["delivered", "delivery_failed", "returned_to_origin"]),
      ]);

    // Aggregate status counts
    const statusMap: Record<string, number> = {};
    for (const { status } of statusCounts.data ?? []) {
      statusMap[status] = (statusMap[status] ?? 0) + 1;
    }

    // Aggregate per-courier performance
    const courierMap: Record<
      string,
      { total: number; delivered: number; failed: number }
    > = {};
    for (const { courier_provider_code: code, status } of courierCounts.data ??
      []) {
      if (!code) continue;
      if (!courierMap[code])
        courierMap[code] = { total: 0, delivered: 0, failed: 0 };
      courierMap[code].total++;
      if (status === "delivered") courierMap[code].delivered++;
      if (["delivery_failed", "returned_to_origin"].includes(status))
        courierMap[code].failed++;
    }

    // Daily volumes
    const dayMap: Record<string, number> = {};
    for (const { created_at } of dailyCounts.data ?? []) {
      const day = created_at.slice(0, 10);
      dayMap[day] = (dayMap[day] ?? 0) + 1;
    }

    const dailyVolume = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Delivery rate
    const terminalShipments = deliveryRate.data ?? [];
    const deliveredCount = terminalShipments.filter(
      (s) => s.status === "delivered"
    ).length;
    const deliveryRatePercent =
      terminalShipments.length > 0
        ? Math.round((deliveredCount / terminalShipments.length) * 100)
        : null;

    return NextResponse.json({
      success: true,
      data: {
        period: { days, from: dateFrom },
        statusBreakdown: statusMap,
        courierPerformance: Object.entries(courierMap).map(([code, stats]) => ({
          courier: code,
          ...stats,
          successRate:
            stats.total > 0
              ? Math.round((stats.delivered / stats.total) * 100)
              : null,
        })),
        dailyVolume,
        deliveryRate: deliveryRatePercent,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      },
    });
  } catch (err: any) {
    console.error("[Analytics API]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
