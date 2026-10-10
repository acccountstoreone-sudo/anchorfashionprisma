"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function getPickListsAction() {
  try {
    const supabase = createAdminClient();
    const { data: lists, error } = await supabase
      .from("pick_lists")
      .select(`
        *,
        warehouses(id, name, warehouse_code),
        items:pick_list_items(id, quantity, is_picked, picked_at)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getPickListsAction error]", error);
      return { success: false, error: error.message };
    }

    // Resolve assigned_to profile names reliably without foreign key schema cache dependency
    const userIds = [...new Set((lists || []).map((l: any) => l.assigned_to).filter(Boolean))];
    const profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email;
        });
      }
    }

    const processed = (lists || []).map((list: any) => {
      const items = list.items || [];
      const totalRequired =
        list.total_items ??
        items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0);
      const totalPicked =
        list.picked_items ??
        items.filter((i: any) => i.is_picked).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0);

      return {
        ...list,
        pick_list_number: list.list_number,
        itemsTotal: totalRequired || 1,
        itemsPicked: totalPicked,
        assignedToName: list.assigned_to && profileMap[list.assigned_to]
          ? profileMap[list.assigned_to]
          : "Unassigned",
      };
    });

    return { success: true, data: processed };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch pick lists" };
  }
}

export async function getPickersAction() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("is_active", true)
      .limit(50);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data || []).map((p: any) => ({
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
        email: p.email,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch pickers" };
  }
}

export async function generatePickListFromOrdersAction(warehouseId?: string) {
  try {
    const supabase = createAdminClient();

    // 1. Find eligible orders using authoritative Postgres order_status enum values
    const query = supabase
      .from("orders")
      .select("id, order_number, status, order_items(id, variant_id, quantity)")
      .in("status", ["confirmed", "paid", "preparing", "ready_for_shipment", "pending_payment"])
      .limit(10);

    const { data: orders, error: ordersErr } = await query;
    if (ordersErr) throw ordersErr;

    // Determine target warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const { data: defaultWh } = await supabase
        .from("warehouses")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      targetWarehouseId = defaultWh?.id;
    }

    if (!targetWarehouseId) {
      return { success: false, error: "No active warehouse found to generate pick list." };
    }

    // 2. Aggregate order items
    let itemsToInsert: {
      order_item_id?: string | null;
      variant_id?: string | null;
      quantity: number;
      is_picked: boolean;
    }[] = [];

    if (orders && orders.length > 0) {
      for (const order of orders) {
        if (order.order_items && order.order_items.length > 0) {
          for (const item of order.order_items) {
            itemsToInsert.push({
              order_item_id: item.id,
              variant_id: item.variant_id,
              quantity: item.quantity || 1,
              is_picked: false,
            });
          }
        }
      }
    }

    // Fallback: If no orders or order items exist, pick sample catalog variants
    if (itemsToInsert.length === 0) {
      const { data: sampleVariants } = await supabase.from("variants").select("id").limit(3);
      if (sampleVariants && sampleVariants.length > 0) {
        itemsToInsert = sampleVariants.map((v) => ({
          variant_id: v.id,
          quantity: 2,
          is_picked: false,
        }));
      }
    }

    const totalQty = itemsToInsert.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const pickListNumber = `PL-${Date.now().toString().slice(-6)}`;

    // 3. Create pick list record respecting schema constraint (pick_type: 'WAVE'|'BATCH', status: 'PENDING')
    const { data: newPickList, error: plErr } = await supabase
      .from("pick_lists")
      .insert({
        list_number: pickListNumber,
        warehouse_id: targetWarehouseId,
        pick_type: "WAVE",
        status: "PENDING",
        total_items: totalQty || 1,
        picked_items: 0,
      })
      .select()
      .single();

    if (plErr) throw plErr;

    // 4. Create pick list items matching schema
    if (itemsToInsert.length > 0) {
      const formattedItems = itemsToInsert.map((item) => ({
        pick_list_id: newPickList.id,
        order_item_id: item.order_item_id || null,
        variant_id: item.variant_id || null,
        quantity: item.quantity || 1,
        is_picked: false,
      }));

      const { error: itemErr } = await supabase.from("pick_list_items").insert(formattedItems);
      if (itemErr) {
        console.warn("Error inserting pick list items:", itemErr);
      }
    }

    try {
      revalidatePath("/admin/operations/fulfillment/pick-lists");
      revalidatePath("/admin/inventory/fulfillment");
    } catch {}

    return { success: true, data: newPickList };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate pick list" };
  }
}

export async function assignPickerAction(pickListId: string, pickerId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("pick_lists")
      .update({
        assigned_to: pickerId || null,
        status: "IN_PROGRESS",
      })
      .eq("id", pickListId);

    if (error) throw error;
    try {
      revalidatePath("/admin/operations/fulfillment/pick-lists");
      revalidatePath("/admin/inventory/fulfillment");
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to assign picker" };
  }
}

export async function updatePickListStatusAction(
  pickListId: string,
  status: "PENDING" | "ASSIGNED" | "PICKING" | "PARTIALLY_PICKED" | "COMPLETED" | "CANCELLED" | "IN_PROGRESS"
) {
  try {
    const supabase = createAdminClient();

    // Map UI status variants to DB check constraint ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    let dbStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" = "PENDING";
    if (status === "COMPLETED") {
      dbStatus = "COMPLETED";
    } else if (status === "CANCELLED") {
      dbStatus = "CANCELLED";
    } else if (
      status === "IN_PROGRESS" ||
      status === "PICKING" ||
      status === "ASSIGNED" ||
      status === "PARTIALLY_PICKED"
    ) {
      dbStatus = "IN_PROGRESS";
    }

    const updates: any = {
      status: dbStatus,
    };

    if (dbStatus === "COMPLETED") {
      updates.completed_at = new Date().toISOString();
      await supabase
        .from("pick_list_items")
        .update({ is_picked: true, picked_at: new Date().toISOString() })
        .eq("pick_list_id", pickListId);
    }

    const { error } = await supabase
      .from("pick_lists")
      .update(updates)
      .eq("id", pickListId);

    if (error) throw error;
    try {
      revalidatePath("/admin/operations/fulfillment/pick-lists");
      revalidatePath("/admin/inventory/fulfillment");
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update pick list status" };
  }
}
