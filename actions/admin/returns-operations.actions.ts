"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export interface ReturnItemInput {
  orderItemId?: string;
  variantId?: string;
  sku?: string;
  productName?: string;
  quantity: number;
  reason?: string;
  condition?: "good" | "damaged" | "defective";
  refundAmount?: number;
}

export interface CreateReturnPayload {
  orderId?: string;
  customerId?: string;
  customerName?: string;
  reason: string;
  notes?: string;
  refundAmount?: number;
  items: ReturnItemInput[];
}

export async function getOperationsReturnsAction(filters: {
  status?: string;
  search?: string;
} = {}) {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("returns")
      .select(`
        *,
        items:return_items(*),
        customer:customers(id, name, email, phone)
      `)
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status.toUpperCase());
    }

    if (filters.search) {
      query = query.ilike("return_number", `%${filters.search}%`);
    }

    const { data: returns, error } = await query;

    if (error) {
      // Fallback query without customer join if foreign key differs
      let fallbackQuery = supabase
        .from("returns")
        .select("*, items:return_items(*)")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "ALL") {
        fallbackQuery = fallbackQuery.eq("status", filters.status.toUpperCase());
      }
      if (filters.search) {
        fallbackQuery = fallbackQuery.ilike("return_number", `%${filters.search}%`);
      }

      const { data: fallbackData, error: fbErr } = await fallbackQuery;
      if (fbErr) return { success: false, error: fbErr.message };

      return { success: true, data: fallbackData || [] };
    }

    return { success: true, data: returns || [] };
  } catch (err: any) {
    console.error("[getOperationsReturnsAction]", err);
    return { success: false, error: err.message || "Failed to fetch returns" };
  }
}

export async function createOperationsReturnAction(payload: CreateReturnPayload) {
  try {
    const supabase = createAdminClient();

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const returnNumber = `RET-${dateStr}-${rand}`;

    const { data: ret, error: returnError } = await supabase
      .from("returns")
      .insert({
        return_number: returnNumber,
        order_id: payload.orderId || null,
        customer_id: payload.customerId || null,
        status: "REQUESTED",
        reason: payload.reason,
        notes: payload.notes || null,
        refund_amount: payload.refundAmount || 0,
      })
      .select()
      .single();

    if (returnError) throw returnError;

    if (payload.items && payload.items.length > 0) {
      const itemsToInsert = payload.items.map((item) => ({
        return_id: ret.id,
        order_item_id: item.orderItemId || null,
        variant_id: item.variantId || null,
        quantity: item.quantity || 1,
        reason: item.reason || payload.reason,
        condition: item.condition || "good",
        restocked: false,
      }));

      const { error: itemsError } = await supabase
        .from("return_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.warn("[createOperationsReturnAction] Warning: Could not insert items", itemsError);
      }
    }

    revalidatePath("/admin/operations/returns/requests");
    revalidatePath("/admin/orders/returns");
    revalidatePath("/admin/shipping/returns");

    return { success: true, data: ret };
  } catch (err: any) {
    console.error("[createOperationsReturnAction]", err);
    return { success: false, error: err.message || "Failed to create return" };
  }
}

export async function updateOperationsReturnStatusAction(
  returnId: string,
  newStatus: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "COMPLETED",
  notes?: string
) {
  try {
    const supabase = createAdminClient();

    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data: updated, error } = await supabase
      .from("returns")
      .update(updateData)
      .eq("id", returnId)
      .select("*, items:return_items(*)")
      .single();

    if (error) throw error;

    // If status is marked as RECEIVED and items exist, restock "good" condition items
    if (newStatus === "RECEIVED" && updated.items?.length) {
      for (const item of updated.items) {
        if (!item.restocked && item.condition === "good" && item.variant_id) {
          // Find first active warehouse or default warehouse
          const { data: wh } = await supabase
            .from("warehouses")
            .select("id")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

          if (wh?.id) {
            const { data: currentLevel } = await supabase
              .from("inventory_levels")
              .select("id, quantity_available")
              .eq("variant_id", item.variant_id)
              .eq("warehouse_id", wh.id)
              .maybeSingle();

            const prevQty = currentLevel?.quantity_available || 0;
            const newQty = prevQty + (item.quantity || 1);

            if (currentLevel?.id) {
              await supabase
                .from("inventory_levels")
                .update({ quantity_available: newQty })
                .eq("id", currentLevel.id);
            } else {
              await supabase
                .from("inventory_levels")
                .insert({
                  variant_id: item.variant_id,
                  warehouse_id: wh.id,
                  quantity_available: newQty,
                  quantity_reserved: 0,
                  reorder_point: 5,
                });
            }

            // Record stock movement
            try {
              await supabase.from("stock_movements").insert({
                variant_id: item.variant_id,
                warehouse_id: wh.id,
                quantity_change: item.quantity || 1,
                reason: `Restocked from return #${updated.return_number}`,
                reason_code: "RETURN",
                reference_id: updated.return_number,
              });
            } catch (e: any) {
              console.warn("Could not insert stock_movements log:", e?.message);
            }

            // Mark item as restocked
            await supabase
              .from("return_items")
              .update({ restocked: true })
              .eq("id", item.id);
          }
        }
      }
    }

    revalidatePath("/admin/operations/returns/requests");
    revalidatePath("/admin/orders/returns");
    revalidatePath("/admin/shipping/returns");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("[updateOperationsReturnStatusAction]", err);
    return { success: false, error: err.message || "Failed to update return status" };
  }
}

export async function getOrdersForReturnAction(search: string = "") {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("orders")
      .select("id, order_number, total_amount, status, customer_id, profiles(first_name, last_name, email)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (search) {
      query = query.ilike("order_number", `%${search}%`);
    }

    const { data: orders, error } = await query;
    if (error) {
      // Fallback
      const { data: fbOrders } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, status, customer_id")
        .order("created_at", { ascending: false })
        .limit(10);
      return { success: true, data: fbOrders || [] };
    }

    return { success: true, data: orders || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch orders" };
  }
}
