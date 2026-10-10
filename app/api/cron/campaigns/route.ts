import { NextResponse } from "next/server";
import { marketingService } from "@/services/marketing.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Check authorization - require valid CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await marketingService.processScheduledCampaigns();
    return NextResponse.json({
      message: "Scheduled campaigns processed successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("[Cron /api/cron/campaigns] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
