"use server";

// ============================================================================
// Shipping Server Actions
// ============================================================================

import { revalidatePath } from "next/cache";
import { ShippingService } from "@/services/shipping/shipping.service";
import { LabelService } from "@/services/shipping/label.service";
import { TrackingService } from "@/services/shipping/tracking.service";
import {
  createShipmentSchema,
  updateShipmentSchema,
  assignCourierSchema,
  cancelShipmentSchema,
  shipmentFiltersSchema,
  trackingQuerySchema,
  CreateShipmentData,
  UpdateShipmentData,
  AssignCourierData,
  CancelShipmentData,
} from "@/schemas/shipping.schema";
import { createClient } from "@/lib/supabase/server-client";

// ---------------------------------------------------------------------------
// Shared response type
// ---------------------------------------------------------------------------
type ActionResponse<T = void> =
  { success: true; data: T } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Get current admin user
// ---------------------------------------------------------------------------
async function getCurrentUserId(): Promise<string | undefined> {
  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}

// ============================================================================
// SHIPMENT ACTIONS
// ============================================================================

export async function createShipmentAction(
  raw: CreateShipmentData
): Promise<ActionResponse<{ shipmentId: string; shipmentNumber: string }>> {
  const parse = createShipmentSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const userId = await getCurrentUserId();
    const service = new ShippingService();
    const shipment = await service.createShipment(parse.data as any, userId);

    revalidatePath("/admin/shipping");
    revalidatePath(`/admin/orders/${parse.data.orderId}`);

    return {
      success: true,
      data: {
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipment_number,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateShipmentAction(
  shipmentId: string,
  raw: UpdateShipmentData
): Promise<ActionResponse<{ shipmentId: string }>> {
  const parse = updateShipmentSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const userId = await getCurrentUserId();
    const service = new ShippingService();
    const updated = await service.updateShipment(
      shipmentId,
      parse.data as any,
      userId
    );

    revalidatePath("/admin/shipping");
    revalidatePath(`/admin/shipping/${shipmentId}`);

    return { success: true, data: { shipmentId: updated.id } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cancelShipmentAction(
  raw: CancelShipmentData
): Promise<ActionResponse<{ shipmentId: string }>> {
  const parse = cancelShipmentSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const userId = await getCurrentUserId();
    const service = new ShippingService();
    const cancelled = await service.cancelShipment(
      parse.data.shipmentId,
      parse.data.reason,
      userId
    );

    revalidatePath("/admin/shipping");
    revalidatePath(`/admin/shipping/${parse.data.shipmentId}`);

    return { success: true, data: { shipmentId: cancelled.id } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function assignCourierAction(
  raw: AssignCourierData
): Promise<
  ActionResponse<{ shipmentId: string; trackingNumber: string | null }>
> {
  const parse = assignCourierSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const userId = await getCurrentUserId();
    const service = new ShippingService();
    const updated = await service.assignCourier(
      parse.data.shipmentId,
      parse.data.courierProviderCode,
      userId,
      parse.data.autoSubmit
    );

    revalidatePath("/admin/shipping");
    revalidatePath(`/admin/shipping/${parse.data.shipmentId}`);

    return {
      success: true,
      data: { shipmentId: updated.id, trackingNumber: updated.tracking_number },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reassignCourierAction(
  shipmentId: string,
  courierProviderCode: string
): Promise<
  ActionResponse<{ shipmentId: string; trackingNumber: string | null }>
> {
  const parse = assignCourierSchema.safeParse({
    shipmentId,
    courierProviderCode,
    autoSubmit: true,
  });
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const userId = await getCurrentUserId();
    const service = new ShippingService();
    const updated = await service.reassignCourier(
      shipmentId,
      parse.data.courierProviderCode,
      userId
    );

    revalidatePath("/admin/shipping");
    revalidatePath(`/admin/shipping/${shipmentId}`);

    return {
      success: true,
      data: { shipmentId: updated.id, trackingNumber: updated.tracking_number },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateLabelAction(
  shipmentId: string
): Promise<ActionResponse<{ labelUrl: string }>> {
  try {
    const userId = await getCurrentUserId();
    const service = new ShippingService();
    const labelUrl = await service.generateLabel(shipmentId, userId);

    if (!labelUrl) {
      return {
        success: false,
        error: "Label generation failed or not supported by provider",
      };
    }

    revalidatePath(`/admin/shipping/${shipmentId}`);
    return { success: true, data: { labelUrl } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function printManifestAction(
  shipmentIds: string[]
): Promise<
  ActionResponse<
    Array<{
      shipmentNumber: string;
      trackingNumber: string | null;
      recipientName: string;
    }>
  >
> {
  try {
    const labelService = new LabelService();
    const manifest = await labelService.generateManifest(shipmentIds);

    return {
      success: true,
      data: manifest.map((m) => ({
        shipmentNumber: m.shipmentNumber,
        trackingNumber: m.trackingNumber,
        recipientName: m.recipientName,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function syncTrackingAction(
  shipmentId: string
): Promise<ActionResponse<{ status: string }>> {
  try {
    const service = new ShippingService();
    const updated = await service.syncTrackingStatus(shipmentId);

    revalidatePath(`/admin/shipping/${shipmentId}`);
    return { success: true, data: { status: updated.status } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchShipmentsAction(
  rawFilters: Record<string, any> = {}
): Promise<ActionResponse<any>> {
  const parse = shipmentFiltersSchema.safeParse(rawFilters);
  if (!parse.success) {
    return { success: false, error: "Invalid filters" };
  }

  try {
    const service = new ShippingService();
    const result = await service.listShipments(parse.data as any);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchShipmentByIdAction(
  shipmentId: string
): Promise<ActionResponse<any>> {
  try {
    const service = new ShippingService();
    const shipment = await service.getShipmentWithDetails(shipmentId);

    if (!shipment) return { success: false, error: "Shipment not found" };
    return { success: true, data: shipment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTrackingTimelineAction(
  trackingNumber: string
): Promise<ActionResponse<any>> {
  const parse = trackingQuerySchema.safeParse({ trackingNumber });
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Invalid tracking number",
    };
  }

  try {
    const trackingService = new TrackingService();
    const timeline = await trackingService.getTrackingTimeline(
      trackingNumber,
      "tracking_number"
    );

    if (!timeline)
      return { success: false, error: "Tracking information not found" };
    return { success: true, data: timeline };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function refreshTrackingAction(
  shipmentId: string
): Promise<ActionResponse<any>> {
  try {
    const trackingService = new TrackingService();
    const timeline = await trackingService.refreshTracking(shipmentId);

    revalidatePath(`/admin/shipping/${shipmentId}`);
    return { success: true, data: timeline };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
