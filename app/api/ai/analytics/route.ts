import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // For a real dashboard, you'd aggregate this in SQL, but for MVP we fetch top logs
    const { data, error } = await supabase
      .from("ai_request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Calculate quick aggregates
    const aggregates = {
      totalRequests: data.length,
      totalCost: data.reduce(
        (acc, log) => acc + Number(log.cost_estimated_usd),
        0
      ),
      avgLatency: data.length
        ? data.reduce((acc, log) => acc + log.latency_ms, 0) / data.length
        : 0,
      errors: data.filter((log) => log.status === "error").length,
    };

    return NextResponse.json({
      aggregates,
      recentLogs: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
