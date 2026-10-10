import { NextResponse } from "next/server";
import { ObservabilityService } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const checks = await ObservabilityService.runHealthChecks();
    const isHealthy = checks.database === "UP" && checks.api === "UP";
    
    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        ...checks,
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "UNKNOWN",
        api: "UNKNOWN",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
