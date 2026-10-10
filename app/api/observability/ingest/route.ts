import { NextResponse } from "next/server";
import {
  ObservabilityService,
  LogEntry,
  MetricEntry,
} from "@/lib/observability";

export async function POST(request: Request) {
  try {
    // Authenticate the request (e.g., check for a valid API key or session if needed)
    // For internal telemetry, we might check an internal token or rely on network boundaries.

    const body = await request.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json(
        { error: "Missing type or payload" },
        { status: 400 }
      );
    }

    if (type === "log") {
      const logEntry: LogEntry = payload;
      await ObservabilityService.log(logEntry);
    } else if (type === "metric") {
      const metricEntry: MetricEntry = payload;
      await ObservabilityService.recordMetric(metricEntry);
    } else {
      return NextResponse.json(
        { error: "Unsupported telemetry type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error: any) {
    console.error("Telemetry ingestion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
