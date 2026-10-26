"use server";

import { PosService, PosOrderPayload } from "@/lib/services/oms/pos.service";
import { createClient } from "@/lib/supabase/server";
import { verifyStaff } from "@/lib/security/roles";

const posService = new PosService();

export async function posSearchCustomersAction(query: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await posService.searchCustomers(query);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function posCreateCustomerAction(data: { firstName: string; lastName: string; phone: string; email?: string }) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const result = await posService.createCustomer(data);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function posSearchProductsAction(query: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const data = await posService.searchProducts(query);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function placePosOrderAction(payload: PosOrderPayload) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const role = user.user_metadata?.role || user.app_metadata?.role || "staff";

    // Re-check auth logic for placing order
    const order = await posService.placePosOrder(user.id, role, payload);
    return { success: true, data: order };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
