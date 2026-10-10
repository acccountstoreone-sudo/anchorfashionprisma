import { createAdminClient } from "@/lib/supabase/admin";

export interface JobPayload {
  eventType: string;
  source: string;
  payload: Record<string, any>;
}

export class QueueService {
  /**
   * Pushes a new background job into the system_events table to be processed asynchronously.
   */
  static async pushJob(job: JobPayload): Promise<boolean> {
    try {
      const supabase = createAdminClient();

      const { error } = await supabase.from("system_events").insert({
        event_type: job.eventType,
        source: job.source,
        payload: job.payload,
        status: "pending",
      });

      if (error) {
        console.error("[QueueService] Failed to push job:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[QueueService] Exception pushing job:", error);
      return false;
    }
  }

  /**
   * Fetches pending jobs to process (usually called by a CRON job or Edge Function)
   */
  static async fetchPendingJobs(limit: number = 100) {
    const supabase = createAdminClient();

    // Using a locked read or simply claiming them by changing status to 'processing'
    // For a simple implementation, we select pending, and update to processing
    const { data: jobs, error: fetchError } = await supabase
      .from("system_events")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError || !jobs || jobs.length === 0) {
      return [];
    }

    const jobIds = jobs.map((j) => j.id);

    // Claim jobs
    const { error: updateError } = await supabase
      .from("system_events")
      .update({ status: "processing" })
      .in("id", jobIds);

    if (updateError) {
      console.error("[QueueService] Failed to claim jobs:", updateError);
      return [];
    }

    return jobs;
  }

  /**
   * Marks a job as completed
   */
  static async markJobCompleted(jobId: string) {
    const supabase = createAdminClient();
    await supabase
      .from("system_events")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  /**
   * Marks a job as failed
   */
  static async markJobFailed(jobId: string, errorDetails: string) {
    const supabase = createAdminClient();
    await supabase
      .from("system_events")
      .update({
        status: "failed",
        error_details: errorDetails,
        processed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}
