"use server";

import { ShippingRepository } from "@/repositories/shipping.repository";
import { revalidatePath } from "next/cache";
import { verifyStaff } from "@/lib/security/roles";

const shippingRepo = new ShippingRepository();

export async function getCouriersAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await shippingRepo.getCouriers();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCourierStatusAction(id: string, is_active: boolean) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    await shippingRepo.updateCourierStatus(id, is_active);
    revalidatePath("/admin/shipping/couriers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getZonesAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await shippingRepo.getZones();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
