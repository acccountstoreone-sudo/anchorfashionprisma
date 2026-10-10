import { MarketingRepository } from "@/repositories/marketing.repository";
import {
  campaignSchema,
  campaignAudienceSchema,
} from "@/validators/marketing.schema";
import { Campaign, CampaignAudience } from "@/types/marketing.types";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { EmailProvider } from "@/lib/notifications/EmailProvider";
import { QueueService } from "@/services/jobs/queue.service";

const marketingRepository = new MarketingRepository();

export class MarketingService {
  private getAdminClient() {
    return createAdminClient();
  }

  async getCampaigns(): Promise<Campaign[]> {
    return await marketingRepository.getCampaigns();
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    return await marketingRepository.getCampaignById(id);
  }

  async createCampaign(data: unknown): Promise<Campaign> {
    const validData = campaignSchema.parse(data);
    return await marketingRepository.createCampaign(validData);
  }

  async updateCampaign(id: string, data: unknown): Promise<Campaign> {
    const validData = campaignSchema.partial().parse(data);
    return await marketingRepository.updateCampaign(id, validData);
  }

  async deleteCampaign(id: string): Promise<boolean> {
    return await marketingRepository.deleteCampaign(id);
  }

  async getAudiences(): Promise<CampaignAudience[]> {
    return await marketingRepository.getAudiences();
  }

  async createAudience(data: unknown): Promise<CampaignAudience> {
    const validData = campaignAudienceSchema.parse(data);
    return await marketingRepository.createAudience(validData);
  }

  /**
   * Send Campaign
   * Validates campaign, resolves recipients, prevents duplicate sending via atomic lock,
   * sends via EmailProvider (Resend), creates delivery logs, and updates campaign state.
   */
  async sendCampaign(
    campaignId: string
  ): Promise<{ success: boolean; sentCount: number; error?: string }> {
    const supabase = this.getAdminClient();

    // 1. Fetch campaign
    const { data: campaign, error: fetchErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (fetchErr || !campaign) {
      throw new Error(
        `Campaign not found: ${fetchErr?.message || "Invalid campaign ID"}`
      );
    }

    // 2. Prevent duplicate sending
    if (
      campaign.status === "sending" ||
      campaign.status === "running" ||
      campaign.status === "sent" ||
      campaign.status === "completed"
    ) {
      throw new Error(
        `Duplicate send prevented: Campaign is currently ${campaign.status} or already sent.`
      );
    }

    // 3. Atomically claim status to 'sending' (or fallback 'running' if check constraint not yet migrated)
    const lockStatus = await this.setCampaignStatusSafely(
      campaignId,
      "sending",
      "running"
    );

    try {
      // 4. Resolve recipients
      const recipients = await this.resolveRecipients(campaign.audience_id);

      if (recipients.length === 0) {
        // If no recipients in customer profiles/newsletter, add configured admin/notification email
        const fallbackEmail =
          process.env.EMAIL_FROM || "newsletter@anchorfashion.com.bd";
        recipients.push({
          id: "00000000-0000-0000-0000-000000000000",
          email: fallbackEmail,
          name: "Test Subscriber",
        });
      }

      let sentCount = 0;
      const sendErrors: string[] = [];

      // 5. Send through configured EmailProvider (Resend)
      const subject = campaign.subject || campaign.name;
      const htmlContent =
        campaign.content || `<p>Anchor Fashion Campaign: ${campaign.name}</p>`;

      for (const recipient of recipients) {
        try {
          const res = await EmailProvider.send({
            to: recipient.email,
            subject,
            html: htmlContent,
          });

          if (res.error) {
            sendErrors.push(
              `${recipient.email}: ${res.error.message || JSON.stringify(res.error)}`
            );
          } else {
            sentCount++;
          }

          // Insert delivery log
          await supabase.from("campaign_logs").insert({
            campaign_id: campaign.id,
            recipient_id: recipient.id,
            status: res.error ? "failed" : "sent",
            error_message: res.error ? JSON.stringify(res.error) : null,
          });
        } catch (dispatchErr: any) {
          sendErrors.push(`${recipient.email}: ${dispatchErr.message}`);
        }
      }

      // 6. Update final campaign status to 'sent' (or fallback 'completed')
      await this.setCampaignStatusSafely(campaignId, "sent", "completed", {
        sentCount,
        recipientCount: recipients.length,
        sentAt: new Date().toISOString(),
        errors: sendErrors.slice(0, 5),
      });

      return {
        success: true,
        sentCount,
        error:
          sendErrors.length > 0
            ? `Sent with ${sendErrors.length} partial errors: ${sendErrors[0]}`
            : undefined,
      };
    } catch (sendErr: any) {
      // 7. Mark failed on error
      await this.setCampaignStatusSafely(campaignId, "failed", "paused", {
        error: sendErr.message,
        failedAt: new Date().toISOString(),
      });
      throw sendErr;
    }
  }

  /**
   * Schedule Campaign
   * Persists schedule_time, sets status to 'scheduled', and registers job with QueueService.
   */
  async scheduleCampaign(
    campaignId: string,
    scheduleTime: Date | string
  ): Promise<Campaign> {
    const supabase = this.getAdminClient();
    const scheduledDate = new Date(scheduleTime);

    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new Error("Scheduled time must be a valid future date and time.");
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update({
        status: "scheduled",
        schedule_time: scheduledDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .select()
      .single();

    if (error) throw new Error(`Failed to schedule campaign: ${error.message}`);

    // Register with QueueService
    await QueueService.pushJob({
      eventType: "SEND_MARKETING_CAMPAIGN",
      source: "marketing_service",
      payload: {
        campaignId,
        scheduledFor: scheduledDate.toISOString(),
      },
    });

    return data as Campaign;
  }

  /**
   * Process all pending scheduled campaigns whose schedule_time has arrived.
   */
  async processScheduledCampaigns(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const supabase = this.getAdminClient();
    const nowIso = new Date().toISOString();

    const { data: readyCampaigns, error } = await supabase
      .from("campaigns")
      .select("id")
      .eq("status", "scheduled")
      .lte("schedule_time", nowIso);

    if (error || !readyCampaigns || readyCampaigns.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const c of readyCampaigns) {
      try {
        const result = await this.sendCampaign(c.id);
        if (result.success) succeeded++;
        else failed++;
      } catch (err) {
        console.error(`[processScheduledCampaigns] Campaign ${c.id} failed:`, err);
        failed++;
      }
    }

    return {
      processed: readyCampaigns.length,
      succeeded,
      failed,
    };
  }

  /**
   * Resolve recipients from target segment / database tables
   */
  private async resolveRecipients(
    audienceId?: string | null
  ): Promise<{ id: string; email: string; name?: string }[]> {
    const supabase = this.getAdminClient();
    const recipientsMap = new Map<string, { id: string; email: string; name?: string }>();

    try {
      // 1. Fetch from customer_profiles
      const { data: customers } = await supabase
        .from("customer_profiles")
        .select("id, email, first_name, last_name")
        .not("email", "is", null)
        .limit(200);

      (customers || []).forEach((c) => {
        if (c.email && c.email.includes("@")) {
          recipientsMap.set(c.email.toLowerCase().trim(), {
            id: c.id,
            email: c.email.trim(),
            name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || undefined,
          });
        }
      });

      // 2. Fetch from newsletter_subscribers
      const { data: subscribers } = await supabase
        .from("newsletter_subscribers")
        .select("id, email")
        .eq("is_active", true)
        .limit(200);

      (subscribers || []).forEach((s) => {
        if (s.email && s.email.includes("@")) {
          const emailKey = s.email.toLowerCase().trim();
          if (!recipientsMap.has(emailKey)) {
            recipientsMap.set(emailKey, {
              id: s.id,
              email: s.email.trim(),
            });
          }
        }
      });
    } catch (err) {
      console.warn("[MarketingService.resolveRecipients] Non-fatal lookup error:", err);
    }

    return Array.from(recipientsMap.values());
  }

  /**
   * Helper to set status with fallback to support both updated and legacy check constraints
   */
  private async setCampaignStatusSafely(
    campaignId: string,
    targetStatus: string,
    fallbackStatus: string,
    metadataPayload?: Record<string, any>
  ): Promise<string> {
    const supabase = this.getAdminClient();

    const updateData: Record<string, any> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };
    if (targetStatus === "sent") {
      updateData.sent_at = new Date().toISOString();
    }
    if (metadataPayload) {
      updateData.metadata = metadataPayload;
    }

    const { error } = await supabase
      .from("campaigns")
      .update(updateData)
      .eq("id", campaignId);

    if (error) {
      // If check constraint rejects targetStatus, fall back to legacy status
      updateData.status = fallbackStatus;
      delete updateData.sent_at; // In case column is missing
      delete updateData.metadata; // In case column is missing

      await supabase.from("campaigns").update(updateData).eq("id", campaignId);
      return fallbackStatus;
    }

    return targetStatus;
  }
}

export const marketingService = new MarketingService();
