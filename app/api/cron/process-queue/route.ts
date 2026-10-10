import { NextResponse } from "next/server";
import { QueueService } from "@/services/jobs/queue.service";
import { EmailGatewayService } from "@/services/email/email-gateway.service";

// Ensure this route is not cached
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Security check: verify this is called by Vercel Cron or an authorized admin
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await QueueService.fetchPendingJobs(50);

    if (jobs.length === 0) {
      return NextResponse.json({ message: "No pending jobs found" });
    }

    let successCount = 0;
    let failCount = 0;

    for (const job of jobs) {
      try {
        // Dispatch job based on event_type
        if (job.event_type === "SEND_TRANSACTIONAL_EMAIL") {
          // payload: { providerCode: string, request: EmailSendRequest }
          const { providerCode, request } = job.payload;
          const result = await EmailGatewayService.sendEmail(
            providerCode || "resend",
            request
          );

          if (result.success) {
            await QueueService.markJobCompleted(job.id);
            successCount++;
          } else {
            await QueueService.markJobFailed(
              job.id,
              result.error?.message || "Unknown Email Error"
            );
            failCount++;
          }
        } else {
          // Handle other job types (syncs, cleanup, etc.)
          // Default mock completion for undefined types
          await QueueService.markJobCompleted(job.id);
          successCount++;
        }
      } catch (err: any) {
        await QueueService.markJobFailed(job.id, err.message);
        failCount++;
      }
    }

    return NextResponse.json({
      message: "Queue processed",
      processed: jobs.length,
      success: successCount,
      failed: failCount,
    });
  } catch (error: any) {
    console.error("Queue processing error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
