import { SteadfastClient } from "./client";
import { CreateShipmentInput, CreateShipmentResult } from "../types";
import { CourierValidationError } from "../errors";

export interface SteadfastOrderResponse {
  status: number;
  message?: string;
  consignment?: {
    consignment_id: number | string;
    invoice: string;
    tracking_code: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    status: string;
    created_at: string;
  };
}

/**
 * Creates an order in Steadfast system
 */
export async function createSteadfastOrder(
  client: SteadfastClient,
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (!input.recipientPhone || input.recipientPhone.length < 11) {
    throw new CourierValidationError("steadfast", "Recipient phone must be a valid 11-digit number");
  }

  if (!input.recipientAddress || input.recipientAddress.length < 5) {
    throw new CourierValidationError("steadfast", "Recipient address is required");
  }

  const payload = {
    invoice: input.invoiceNumber || input.orderId,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    recipient_address: input.recipientAddress,
    cod_amount: input.isCOD ? Math.round(input.codAmount) : 0,
    note: input.specialInstructions || "",
  };

  const { data } = await client.request<SteadfastOrderResponse>(
    "POST",
    "/create_order",
    payload
  );

  if (data.status !== 200 || !data.consignment) {
    throw new CourierValidationError(
      "steadfast",
      data.message || "Failed to create consignment in Steadfast"
    );
  }

  const consignmentId = String(data.consignment.consignment_id);
  const trackingCode = data.consignment.tracking_code || consignmentId;

  return {
    success: true,
    consignmentId,
    trackingCode,
    courierCode: "steadfast",
    statusCode: data.consignment.status,
    rawResponse: data,
  };
}

/**
 * Cancel an order in Steadfast system
 */
export async function cancelSteadfastOrder(
  client: SteadfastClient,
  consignmentId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data } = await client.request<{ status: number; message?: string }>(
      "DELETE",
      `/delete_order/${consignmentId}`
    );

    return {
      success: data.status === 200,
      message: data.message || (data.status === 200 ? "Order cancelled" : "Cancellation failed"),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to cancel Steadfast order",
    };
  }
}
