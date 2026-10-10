import { PathaoClient } from "./client";
import { CreateShipmentInput, CreateShipmentResult } from "../types";
import { CourierValidationError } from "../errors";

export interface PathaoOrderResponse {
  type: string;
  code: number;
  message: string;
  data: {
    consignment_id: string;
    merchant_order_id: string;
    order_status: string;
    delivery_fee: number;
  };
}

/**
 * Creates an order in Pathao Aladdin system
 */
export async function createPathaoOrder(
  client: PathaoClient,
  input: CreateShipmentInput,
  storeId?: string
): Promise<CreateShipmentResult> {
  const targetStoreId = storeId || "default";

  if (!input.recipientPhone || input.recipientPhone.length < 11) {
    throw new CourierValidationError("pathao", "Recipient phone must be a valid 11-digit number");
  }

  if (!input.recipientAddress || input.recipientAddress.length < 10) {
    throw new CourierValidationError("pathao", "Recipient address must be at least 10 characters");
  }

  // Pathao requires numeric city/zone IDs if known, or defaults to 1 for Dhaka
  const cityId = Number(input.recipientCity) || 1;
  const zoneId = Number(input.recipientZone) || 1;

  const payload = {
    store_id: Number(targetStoreId) || 1,
    merchant_order_id: input.invoiceNumber || input.orderId,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    recipient_address: input.recipientAddress,
    recipient_city: cityId,
    recipient_zone: zoneId,
    recipient_area: input.recipientArea ? Number(input.recipientArea) || undefined : undefined,
    delivery_type: 48, // Standard 48-hour delivery
    item_type: 2, // Parcel / clothing
    special_instruction: input.specialInstructions || "",
    item_quantity: input.itemQuantity || 1,
    item_weight: input.weightKg || 0.5,
    amount_to_collect: input.isCOD ? Math.round(input.codAmount) : 0,
    item_description: input.itemDescription || "Fashion & Apparel",
  };

  const { data } = await client.request<PathaoOrderResponse>(
    "POST",
    "/aladdin/api/v1/orders",
    payload,
    true
  );

  const consignmentId = data.data?.consignment_id;
  if (!consignmentId) {
    throw new CourierValidationError(
      "pathao",
      data.message || "Order response did not contain a consignment ID"
    );
  }

  return {
    success: true,
    consignmentId,
    trackingCode: consignmentId,
    courierCode: "pathao",
    statusCode: data.data.order_status,
    deliveryFee: data.data.delivery_fee,
    rawResponse: data,
  };
}

/**
 * Cancel an existing Pathao consignment
 */
export async function cancelPathaoOrder(
  client: PathaoClient,
  consignmentId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data } = await client.request<{ message?: string; type?: string }>(
      "POST",
      `/aladdin/api/v1/orders/${consignmentId}/cancel`,
      {},
      true
    );

    return {
      success: true,
      message: data.message || "Shipment cancelled successfully",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to cancel Pathao shipment",
    };
  }
}
