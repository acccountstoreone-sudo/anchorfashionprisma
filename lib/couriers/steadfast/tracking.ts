import { SteadfastClient } from "./client";
import { TrackingResult, CODSettlementResult } from "../types";
import { mapSteadfastStatus } from "./mapper";

export interface SteadfastStatusResponse {
  status: number;
  delivery_status?: string;
  message?: string;
}

export interface SteadfastBalanceResponse {
  status: number;
  current_balance?: number;
}

/**
 * Fetches current delivery status for a Steadfast consignment
 */
export async function getSteadfastTracking(
  client: SteadfastClient,
  consignmentIdOrTrackingCode: string
): Promise<TrackingResult> {
  let endpoint = `/status_by_cid/${consignmentIdOrTrackingCode}`;
  if (isNaN(Number(consignmentIdOrTrackingCode))) {
    endpoint = `/status_by_trackingcode/${consignmentIdOrTrackingCode}`;
  }

  const { data } = await client.request<SteadfastStatusResponse>("GET", endpoint);

  const rawStatus = data.delivery_status || "in_review";
  const normalized = mapSteadfastStatus(rawStatus);

  const events = [
    {
      status: rawStatus,
      description: `Delivery Status: ${rawStatus}`,
      timestamp: new Date().toISOString(),
      rawEvent: data,
    },
  ];

  return {
    success: true,
    consignmentId: consignmentIdOrTrackingCode,
    trackingCode: consignmentIdOrTrackingCode,
    currentStatus: rawStatus,
    currentStatusNormalized: normalized,
    events,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves current COD settlement balance from Steadfast
 */
export async function getSteadfastBalance(
  client: SteadfastClient
): Promise<CODSettlementResult> {
  try {
    const { data } = await client.request<SteadfastBalanceResponse>("GET", "/get_balance");
    const currentBalance = Number(data.current_balance || 0);

    return {
      settledAmount: currentBalance,
      pendingAmount: 0,
      feeAmount: 0,
      currency: "BDT",
      status: "settled",
      raw: data,
    };
  } catch {
    return {
      settledAmount: 0,
      pendingAmount: 0,
      feeAmount: 0,
      currency: "BDT",
      status: "unknown",
    };
  }
}
