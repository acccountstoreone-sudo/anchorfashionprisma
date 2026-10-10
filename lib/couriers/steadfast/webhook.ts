import { WebhookResult } from "../types";
import { mapSteadfastStatus } from "./mapper";

export interface SteadfastWebhookPayload {
  consignment_id?: number | string;
  tracking_code?: string;
  invoice?: string;
  status?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/**
 * Handles incoming Steadfast webhook events
 */
export async function handleSteadfastWebhook(
  payload: unknown
): Promise<WebhookResult> {
  const data = payload as SteadfastWebhookPayload;

  const consignmentId = data.consignment_id ? String(data.consignment_id) : undefined;
  const trackingCode = data.tracking_code || consignmentId;
  const statusRaw = data.status;

  if (!consignmentId && !trackingCode) {
    return {
      success: false,
      handled: false,
      message: "Missing consignment_id or tracking_code in Steadfast webhook payload",
      rawPayload: payload,
    };
  }

  const normalizedStatus = mapSteadfastStatus(statusRaw);

  return {
    success: true,
    handled: true,
    consignmentId,
    trackingCode,
    status: normalizedStatus,
    eventTime: data.updated_at || new Date().toISOString(),
    message: `Steadfast status updated to ${normalizedStatus} (${statusRaw})`,
    rawPayload: payload,
  };
}
