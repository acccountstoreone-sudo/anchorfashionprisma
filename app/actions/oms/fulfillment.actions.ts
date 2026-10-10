"use server";

import { FulfillmentService } from "@/lib/services/oms/fulfillment.service";
import {
  FulfillShipmentInput,
  fulfillShipmentSchema,
} from "@/lib/validations/oms";
import { revalidatePath } from "next/cache";

const fulfillmentService = new FulfillmentService();

export async function assignTrackingAction(input: FulfillShipmentInput) {
  try {
    const validatedData = fulfillShipmentSchema.parse(input);
    await fulfillmentService.assignShipmentTracking(validatedData);
    revalidatePath(`/admin/orders/${validatedData.order_id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reserveInventoryAction(orderId: string) {
  try {
    // Confirms (consumes) reserved stock — stock has physically shipped.
    await fulfillmentService.confirmInventoryForShipment(orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
