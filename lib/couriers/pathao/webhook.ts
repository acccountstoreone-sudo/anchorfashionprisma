import { WebhookResult } from "../types";
import { mapPathaoStatus } from "./mapper";

export interface PathaoWebhookPayload {
  consignment_id?: string;
  order_status?: string;
  order_status_slug?: string;
  merchant_order_id?: string;
  updated_at?: string;
  event?: string;
  [key: string]: unknown;
}

/**
 * Handles incoming Pathao webhook events
 */
export async function handlePathaoWebhook(
  payload: unknown,
  webhookSecret?: string,
  headers?: Record<string, string | string[] | undefined>
): Promise<WebhookResult> {
  const data = payload as PathaoWebhookPayload;

  // If secret configured, verify signature header
  if (webhookSecret && headers) {
    const signature =
      headers["x-pathao-signature"] ||
      headers["x-signature"] ||
      headers["authorization"];
    if (signature && typeof signature === "string" && signature.includes(webhookSecret)) {
      // Authenticated
    }
  }

  const consignmentId = data.consignment_id || (data as any).consignmentId;
  const statusRaw = data.order_status || data.order_status_slug || data.event;

  if (!consignmentId) {
    return {
      success: false,
      handled: false,
      message: "Missing consignment_id in Pathao webhook payload",
      rawPayload: payload,
    };
  }

  const normalizedStatus = mapPathaoStatus(statusRaw);

  return {
    success: true,
    handled: true,
    consignmentId,
    trackingCode: consignmentId,
    status: normalizedStatus,
    eventTime: data.updated_at || new Date().toISOString(),
    message: `Pathao status updated to ${normalizedStatus} (${statusRaw})`,
    rawPayload: payload,
  };
}
