import crypto from "crypto";
import { QueueService } from "@/services/jobs/queue.service";
import { createAdminClient } from "@/lib/supabase/admin";

export class WebhookService {
  /**
   * Verifies the HMAC signature of an incoming webhook payload
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = "sha256"
  ): boolean {
    try {
      const hmac = crypto.createHmac(algorithm, secret);
      const digest = hmac.update(payload).digest("hex");

      // Use timingSafeEqual to prevent timing attacks
      const signatureBuffer = Buffer.from(signature);
      const digestBuffer = Buffer.from(digest);

      if (signatureBuffer.length !== digestBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    } catch (error) {
      console.error("[WebhookService] Signature verification error:", error);
      return false;
    }
  }

  /**
   * Dispatches an incoming webhook event to the background job queue for async processing
   */
  static async enqueueIncomingWebhook(
    eventType: string,
    provider: string,
    payload: any
  ): Promise<boolean> {
    return await QueueService.pushJob({
      eventType: `WEBHOOK_IN_${eventType.toUpperCase()}`,
      source: provider,
      payload,
    });
  }

  /**
   * Triggers an outgoing webhook (e.g., notifying external partners of an order update)
   * It pushes to the webhook_deliveries queue to be retried automatically.
   */
  static async triggerOutgoingWebhook(
    webhookId: string,
    eventType: string,
    payload: any
  ): Promise<boolean> {
    try {
      const supabase = createAdminClient();

      const { error } = await supabase.from("webhook_deliveries").insert({
        webhook_id: webhookId,
        event_type: eventType,
        payload: payload,
        status: "pending",
      });

      if (error) {
        console.error(
          "[WebhookService] Failed to queue outgoing webhook:",
          error
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[WebhookService] Exception queueing outgoing webhook:",
        error
      );
      return false;
    }
  }
}
