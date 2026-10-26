import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyStaff } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await verifyStaff();
    // For a real dashboard, you'd aggregate this in SQL, but for MVP we fetch top logs
    const { data, error } = await supabase
      .from("ai_request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Calculate quick aggregates
    const safeData = data || [];
    const aggregates = {
      totalRequests: safeData.length,
      totalCost: safeData.reduce(
        (acc: number, log: any) => acc + Number(log.cost_estimated_usd || 0),
        0
      ),
      avgLatency: safeData.length
        ? safeData.reduce((acc: number, log: any) => acc + (log.latency_ms || 0), 0) / safeData.length
        : 0,
      errors: safeData.filter((log: any) => log.status === "error").length,
    };

    return NextResponse.json({
      aggregates,
      recentLogs: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
