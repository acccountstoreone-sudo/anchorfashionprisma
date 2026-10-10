import { PaymentProviderFactory } from "./payment.factory";
import { PaymentRepository } from "@/repositories/payment.repository";
import { PaymentProviderRepository } from "@/repositories/payment-provider.repository";
import { PaymentProviderCode } from "@/types/payment.types";
import crypto from "crypto";

export class WebhookService {
  private paymentRepo = new PaymentRepository();
  private providerRepo = new PaymentProviderRepository();

  /**
   * Main entry point for webhook processing
   */
  async handleWebhook(
    providerCode: PaymentProviderCode,
    payload: any,
    headers: Record<string, any>,
    rawBody: string
  ) {
    const providerConfig =
      await this.providerRepo.getProviderByCode(providerCode);
    if (!providerConfig) {
      throw new Error(`Webhook received for unknown provider: ${providerCode}`);
    }

    // Generate a signature/idempotency key based on payload hash to prevent duplicates if no native ID
    const eventId =
      payload.id || crypto.createHash("sha256").update(rawBody).digest("hex");

    // Log the incoming webhook as pending
    const webhookRecord = await this.paymentRepo.createWebhookEvent({
      provider_id: providerConfig.id,
      event_type: payload.type || "unknown",
      payload: payload,
      headers: headers,
      signature: headers["signature"] || eventId, // Extract signature from header if exists
      status: "pending",
    });

    try {
      const providerInstance = PaymentProviderFactory.createProvider(
        providerConfig.code,
        providerConfig.config
      );

      // 1. Verify Signature
      const isValidSignature = providerInstance.validateWebhookSignature(
        rawBody,
        headers,
        headers["signature"] || "" // Specific header keys depend on provider
      );

      if (!isValidSignature) {
        throw new Error("Invalid webhook signature");
      }

      // 2. Process Event (Implementation would route based on event_type to update transactions/orders)
      await this.processEvent(providerCode, payload);

      // 3. Mark as completed
      await this.paymentRepo.updateWebhookEvent(webhookRecord.id, {
        status: "completed",
      });

      return { success: true };
    } catch (error: any) {
      // 4. Mark as failed for retry mechanism
      await this.paymentRepo.updateWebhookEvent(webhookRecord.id, {
        status: "failed",
      } as any);
      throw error;
    }
  }

  private async processEvent(providerCode: PaymentProviderCode, payload: any) {
    // In a real implementation, this would switch on event type (e.g. payment.success, refund.completed)
    // and update the corresponding transactions or orders.
    // For this architecture skeleton, we consider the processing done.
    console.log(`Processing event for ${providerCode}`, payload);
  }
}
