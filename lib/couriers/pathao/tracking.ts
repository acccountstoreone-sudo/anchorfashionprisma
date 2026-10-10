import { PathaoClient } from "./client";
import { TrackingResult, TrackingEvent, DeliveryFeeInput, DeliveryFeeResult } from "../types";
import { mapPathaoStatus } from "./mapper";

export interface PathaoTrackingResponse {
  type: string;
  data: {
    consignment_id: string;
    merchant_order_id?: string;
    order_status: string;
    order_status_slug?: string;
    updated_at?: string;
    history?: Array<{
      status: string;
      time: string;
      message?: string;
    }>;
  };
}

/**
 * Fetches real tracking milestones for a consignment
 */
export async function getPathaoTracking(
  client: PathaoClient,
  consignmentId: string
): Promise<TrackingResult> {
  const { data } = await client.request<PathaoTrackingResponse>(
    "GET",
    `/aladdin/api/v1/orders/${consignmentId}/info`,
    undefined,
    true
  );

  const orderData = data.data || {};
  const currentStatus = orderData.order_status || "Unknown";
  const normalized = mapPathaoStatus(orderData.order_status_slug || currentStatus);

  const events: TrackingEvent[] = (orderData.history || []).map((h) => ({
    status: h.status,
    description: h.message || h.status,
    timestamp: h.time || new Date().toISOString(),
    rawEvent: h,
  }));

  // If no history returned yet, create an initial event from current status
  if (events.length === 0) {
    events.push({
      status: currentStatus,
      description: `Current status: ${currentStatus}`,
      timestamp: orderData.updated_at || new Date().toISOString(),
      rawEvent: orderData,
    });
  }

  return {
    success: true,
    consignmentId,
    trackingCode: consignmentId,
    currentStatus,
    currentStatusNormalized: normalized,
    events,
    updatedAt: orderData.updated_at || new Date().toISOString(),
  };
}

/**
 * Calculates delivery cost with Pathao merchant rate calculator
 */
export async function calculatePathaoFee(
  client: PathaoClient,
  input: DeliveryFeeInput,
  storeId?: string
): Promise<DeliveryFeeResult> {
  try {
    const payload = {
      store_id: Number(storeId) || 1,
      item_type: 2,
      delivery_type: 48,
      item_weight: input.weightKg || 0.5,
      recipient_city: Number(input.recipientCity) || 1,
      recipient_zone: Number(input.recipientZone) || 1,
    };

    const { data } = await client.request<{
      data: { plan_id: number; price: number; additional_charge?: number };
    }>("POST", "/aladdin/api/v1/merchant/order-price-calculation", payload, true);

    const deliveryFee = Number(data.data?.price || 60);
    const codFee = input.isCOD ? Number(data.data?.additional_charge || 0) : 0;

    return {
      deliveryFee,
      codFee,
      totalFee: deliveryFee + codFee,
    };
  } catch {
    // Standard fallback in Bangladesh (Inside Dhaka 60tk, Outside Dhaka 120tk)
    const fallbackFee = (Number(input.recipientCity) || 1) === 1 ? 60 : 120;
    return {
      deliveryFee: fallbackFee,
      codFee: input.isCOD ? 10 : 0,
      totalFee: fallbackFee + (input.isCOD ? 10 : 0),
    };
  }
}
