"use server";

// ============================================================================
// Delivery Zones Server Actions
// ============================================================================

import { revalidatePath } from "next/cache";
import { RateCalculatorService } from "@/services/shipping/rate-calculator.service";
import { DeliveryZoneRepository } from "@/repositories/delivery-zone.repository";
import {
  shippingRateQuerySchema,
  createDeliveryZoneSchema,
  createShippingRateSchema,
} from "@/schemas/shipping.schema";

type ActionResponse<T = void> =
  { success: true; data: T } | { success: false; error: string };

export async function calculateShippingRateAction(
  raw: Record<string, any>
): Promise<ActionResponse<any>> {
  const parse = shippingRateQuerySchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const calculator = new RateCalculatorService();
    const zone = await calculator.getZoneByAddress(
      parse.data.district,
      parse.data.city
    );

    if (!zone) {
      return {
        success: true,
        data: {
          total: 0,
          baseRate: 0,
          weightCharge: 0,
          codCharge: 0,
          isFreeShipping: false,
          zone: null,
          rate: null,
          message: "No zone found for the provided address",
        },
      };
    }

    const calculation = await calculator.calculateShippingCharge(
      zone.id,
      parse.data.weightKg,
      parse.data.orderValue,
      parse.data.isCOD
    );

    return { success: true, data: calculation };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchDeliveryZonesAction(): Promise<
  ActionResponse<any[]>
> {
  try {
    const calculator = new RateCalculatorService();
    const zones = await calculator.getActiveZones();
    return { success: true, data: zones };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDeliveryZoneAction(
  zoneId: string
): Promise<ActionResponse<any>> {
  try {
    const repo = new DeliveryZoneRepository();
    const zone = await repo.getZoneById(zoneId);
    if (!zone) return { success: false, error: "Zone not found" };
    return { success: true, data: zone };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createDeliveryZoneAction(
  raw: Record<string, any>
): Promise<ActionResponse<{ zoneId: string }>> {
  const parse = createDeliveryZoneSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const repo = new DeliveryZoneRepository();
    const zone = await repo.createZone(parse.data as any);

    revalidatePath("/admin/shipping/zones");
    return { success: true, data: { zoneId: zone.id } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateDeliveryZoneAction(
  zoneId: string,
  raw: Record<string, any>
): Promise<ActionResponse<{ zoneId: string }>> {
  try {
    const repo = new DeliveryZoneRepository();
    const zone = await repo.updateZone(zoneId, raw);

    revalidatePath("/admin/shipping/zones");
    return { success: true, data: { zoneId: zone.id } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createShippingRateAction(
  raw: Record<string, any>
): Promise<ActionResponse<{ rateId: string }>> {
  const parse = createShippingRateSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.errors[0]?.message ?? "Validation failed",
    };
  }

  try {
    const repo = new DeliveryZoneRepository();
    const { zoneId, courierProviderId, ...rest } = parse.data;
    const rate = await repo.upsertRate({
      zone_id: zoneId,
      courier_provider_id: courierProviderId ?? null,
      ...rest,
    } as any);

    revalidatePath("/admin/shipping/zones");
    return { success: true, data: { rateId: rate.id } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
