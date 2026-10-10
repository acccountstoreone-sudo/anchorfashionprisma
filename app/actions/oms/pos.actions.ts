"use server";

import { PosService, PosOrderPayload } from "@/lib/services/oms/pos.service";
import { createClient } from "@/lib/supabase/server";

const posService = new PosService();

export async function posSearchCustomersAction(query: string) {
  try {
    const data = await posService.searchCustomers(query);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function posCreateCustomerAction(data: { firstName: string; lastName: string; phone: string; email?: string }) {
  try {
    const result = await posService.createCustomer(data);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function posSearchProductsAction(query: string) {
  try {
    const data = await posService.searchProducts(query);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function placePosOrderAction(payload: PosOrderPayload) {
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
