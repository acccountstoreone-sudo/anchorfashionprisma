"use server";

import { ShippingRepository } from "@/repositories/shipping.repository";
import { revalidatePath } from "next/cache";

const shippingRepo = new ShippingRepository();

export async function getCouriersAction() {
  try {
    const data = await shippingRepo.getCouriers();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCourierStatusAction(id: string, is_active: boolean) {
  try {
    await shippingRepo.updateCourierStatus(id, is_active);
    revalidatePath("/admin/shipping/couriers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getZonesAction() {
  try {
    const data = await shippingRepo.getZones();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
