"use server";

import { InventoryService } from "@/services/inventory.service";
import { InventoryLevel, InventoryMovement } from "@/types/inventory.types";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function getAllInventory(
  page: number = 1,
  limit: number = 20
): Promise<{ data?: InventoryLevel[]; total?: number; error?: string }> {
  try {
    const service = new InventoryService();
    const result = await service.getAllInventory(page, limit);
    return { data: result.data, total: result.total };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getStockAvailability(
  variantId: string,
  warehouseId?: string
) {
  try {
    const service = new InventoryService();
    const data = await service.getStockAvailability(variantId, warehouseId);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function adjustStock(
  inventoryId: string,
  newAvailable: number,
  newReserved: number,
  reason: string
) {
  try {
    const service = new InventoryService();
    await service.adjustStock(inventoryId, newAvailable, newReserved, reason);
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function transferStock(
  variantId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
  reason: string,
  notes?: string
) {
  try {
    const service = new InventoryService();
    await service.transferStock(
      variantId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reason,
      notes
    );
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getInventoryMovements(
  page: number = 1,
  limit: number = 20,
  warehouseId?: string,
  variantId?: string
) {
  try {
    const service = new InventoryService();
    const result = await service.getMovements(
      page,
      limit,
      warehouseId,
      variantId
    );
    return { data: result.data, total: result.total };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function receivePurchase(
  poId: string,
  items: { variantId: string; warehouseId: string; quantity: number }[],
  notes?: string
) {
  try {
    // Basic implementation that just adjusts stock upwards for received items
    const service = new InventoryService();
    const { createAdminClient } = require("@/lib/supabase/admin-client");
    const supabase = createAdminClient();

    for (const item of items) {
      // Find current level or create
      const levels = await service.getStockAvailability(
        item.variantId,
        item.warehouseId
      );

      if (
        levels.status === "OUT_OF_STOCK" &&
        levels.available === 0 &&
        levels.reserved === 0
      ) {
        // Need to create a level first if it doesn't exist
        const { data: existing } = await supabase
          .from("inventory_levels")
          .select("id")
          .eq("variant_id", item.variantId)
          .eq("warehouse_id", item.warehouseId)
          .maybeSingle();

        if (existing) {
          await service.adjustStock(
            existing.id,
            item.quantity,
            0,
            "PURCHASE_RECEIPT"
          );
        } else {
          // It doesn't exist, this is complex for MVP, so we just use adjustStock assuming it exists or insert
          const { error: insertError } = await supabase
            .from("inventory_levels")
            .insert({
              variant_id: item.variantId,
              warehouse_id: item.warehouseId,
              quantity_available: item.quantity,
              quantity_reserved: 0,
            });
          if (insertError) throw insertError;

          try {
            await supabase.from("stock_movements").insert({
              variant_id: item.variantId,
              warehouse_id: item.warehouseId,
              quantity_change: item.quantity,
              reason: notes || "Received from PO",
              reason_code: "PURCHASE_RECEIPT",
              reference_id: poId,
            });
          } catch (e: any) {
            console.warn("Could not insert stock_movements log:", e?.message);
          }
        }
      } else {
        // Get inventory_id and adjust
        const { data: existing } = await supabase
          .from("inventory_levels")
          .select("id, quantity_available, quantity_reserved")
          .eq("variant_id", item.variantId)
          .eq("warehouse_id", item.warehouseId)
          .maybeSingle();

        if (existing) {
          await service.adjustStock(
            existing.id,
            existing.quantity_available + item.quantity,
            existing.quantity_reserved,
            "PURCHASE_RECEIPT"
          );
        }
      }
    }

    // Update PO status to DELIVERED
    await supabase
      .from("procurement_orders")
      .update({ status: "DELIVERED" })
      .eq("id", poId);

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addStockAction(data: {
  variantId: string;
  warehouseId: string;
  quantity: number;
  reason: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!data.quantity || data.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero" };
    }
    const supabase = createAdminClient();

    // Verify variant and warehouse exist
    const [{ data: variant }, { data: warehouse }] = await Promise.all([
      supabase.from("variants").select("id").eq("id", data.variantId).maybeSingle(),
      supabase.from("warehouses").select("id").eq("id", data.warehouseId).maybeSingle(),
    ]);

    if (!variant) return { success: false, error: "Product variant not found" };
    if (!warehouse) return { success: false, error: "Warehouse not found" };

    const { data: existing, error: fetchErr } = await supabase
      .from("inventory_levels")
      .select("id, quantity_available")
      .eq("variant_id", data.variantId)
      .eq("warehouse_id", data.warehouseId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const previousQuantity = existing?.quantity_available || 0;
    const newQuantity = previousQuantity + data.quantity;
    let inventoryId: string;

    if (existing) {
      const { error: updateErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) throw updateErr;
      inventoryId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("inventory_levels")
        .insert({
          variant_id: data.variantId,
          warehouse_id: data.warehouseId,
          quantity_available: data.quantity,
          quantity_reserved: 0,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      inventoryId = inserted?.id;
    }

    // Record stock movement
    try {
      await supabase.from("stock_movements").insert({
        variant_id: data.variantId,
        warehouse_id: data.warehouseId,
        quantity_change: data.quantity,
        reason: data.notes || `Stock added: ${data.reason}`,
        reason_code: data.reason,
      });
    } catch (e: any) {
      console.warn("Could not insert stock_movements log:", e?.message);
    }

    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");
    return { success: true, data: { id: inventoryId, quantity_available: newQuantity } };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to add stock" };
  }
}

export interface StockInwardItemInput {
  variantId: string;
  sku?: string;
  name?: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  zoneId?: string;
  binId?: string;
  updateCostPrice?: boolean;
}

export interface CreateStockInwardInput {
  inwardNumber?: string;
  warehouseId: string;
  inwardType: "PURCHASE_RECEIPT" | "FACTORY_PRODUCTION" | "TRANSFER_IN" | "CUSTOMER_RETURN" | "INITIAL_STOCK" | "CORRECTION";
  supplierId?: string;
  receivedDate?: string;
  receivedBy?: string;
  notes?: string;
  items: StockInwardItemInput[];
}

export async function createStockInwardAction(
  data: CreateStockInwardInput
): Promise<{
  success: boolean;
  data?: {
    inwardNumber: string;
    warehouseId: string;
    totalItems: number;
    totalQuantity: number;
    totalCost: number;
    receivedAt: string;
    items: Array<{
      variantId: string;
      sku?: string;
      name?: string;
      quantity: number;
      unitCost: number;
      lineTotal: number;
      previousQuantity: number;
      newQuantity: number;
      batchNumber?: string;
    }>;
  };
  error?: string;
}> {
  try {
    if (!data.warehouseId) {
      return { success: false, error: "Destination warehouse is required" };
    }

    const validItems = (data.items || []).filter(
      (item) => item.variantId && Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      return {
        success: false,
        error: "At least one product variant with quantity greater than zero is required",
      };
    }

    const supabase = createAdminClient();

    // Verify warehouse exists
    const { data: warehouse, error: whErr } = await supabase
      .from("warehouses")
      .select("id, name, is_active")
      .eq("id", data.warehouseId)
      .maybeSingle();

    if (whErr || !warehouse) {
      console.warn("Warehouse lookup error:", whErr?.message, "for id:", data.warehouseId);
      return { success: false, error: "Destination warehouse not found" };
    }

    const inwardNumber =
      data.inwardNumber?.trim() ||
      `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const processedItems: Array<{
      variantId: string;
      sku?: string;
      name?: string;
      quantity: number;
      unitCost: number;
      lineTotal: number;
      previousQuantity: number;
      newQuantity: number;
      batchNumber?: string;
    }> = [];

    let totalQuantity = 0;
    let totalCost = 0;

    for (const item of validItems) {
      const qty = Math.floor(Number(item.quantity));
      const cost = Math.max(0, Number(item.unitCost) || 0);
      const lineCost = Number((qty * cost).toFixed(2));

      // Fetch existing inventory level
      const { data: existing, error: fetchErr } = await supabase
        .from("inventory_levels")
        .select("id, quantity_available")
        .eq("variant_id", item.variantId)
        .eq("warehouse_id", data.warehouseId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const previousQuantity = existing?.quantity_available || 0;
      const newQuantity = previousQuantity + qty;

      if (existing) {
        const { error: updateErr } = await supabase
          .from("inventory_levels")
          .update({
            quantity_available: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("inventory_levels")
          .insert({
            variant_id: item.variantId,
            warehouse_id: data.warehouseId,
            quantity_available: qty,
            quantity_reserved: 0,
          });
        if (insertErr) throw insertErr;
      }

      // Optionally update product cost price
      if (item.updateCostPrice && cost > 0) {
        try {
          const { data: vData } = await supabase
            .from("variants")
            .select("product_id")
            .eq("id", item.variantId)
            .maybeSingle();
          if (vData?.product_id) {
            await supabase
              .from("products")
              .update({
                cost_price: cost,
                updated_at: new Date().toISOString(),
              })
              .eq("id", vData.product_id);
          }
        } catch (e) {
          console.warn(`Could not update cost_price for product of variant ${item.variantId}`, e);
        }
      }

      // Record stock movement
      const movementNotes = `[${inwardNumber}] ${data.inwardType}${
        item.batchNumber ? ` | Lot: ${item.batchNumber}` : ""
      }${data.receivedBy ? ` | By: ${data.receivedBy}` : ""}${
        data.notes ? ` | Notes: ${data.notes}` : ""
      }`;

      try {
        await supabase.from("stock_movements").insert({
          variant_id: item.variantId,
          warehouse_id: data.warehouseId,
          quantity_change: qty,
          reason: movementNotes,
          reason_code: data.inwardType,
          reference_id: inwardNumber,
        });
      } catch (e: any) {
        console.warn("Could not insert stock_movements log for inward item:", e?.message);
      }

      totalQuantity += qty;
      totalCost += lineCost;

      processedItems.push({
        variantId: item.variantId,
        sku: item.sku,
        name: item.name,
        quantity: qty,
        unitCost: cost,
        lineTotal: lineCost,
        previousQuantity,
        newQuantity,
        batchNumber: item.batchNumber,
      });
    }

    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/operations/procurement/purchase-orders");

    return {
      success: true,
      data: {
        inwardNumber,
        warehouseId: data.warehouseId,
        totalItems: processedItems.length,
        totalQuantity,
        totalCost: Number(totalCost.toFixed(2)),
        receivedAt: data.receivedDate || new Date().toISOString(),
        items: processedItems,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to process stock inward",
    };
  }
}


export async function recordManualMovementAction(data: {
  variantId: string;
  warehouseId: string;
  movementType: "RECEIVE" | "ADJUST" | "DAMAGE" | "RETURN" | "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  reason: string;
  toWarehouseId?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!data.quantity || data.quantity === 0) {
      return { success: false, error: "Quantity cannot be zero" };
    }

    // If transfer, delegate to transferStock
    if (data.movementType === "TRANSFER") {
      if (!data.toWarehouseId) {
        return { success: false, error: "Destination warehouse is required for transfer" };
      }
      if (data.warehouseId === data.toWarehouseId) {
        return { success: false, error: "Source and destination warehouse must be different" };
      }
      const transferRes = await transferStock(
        data.variantId,
        data.warehouseId,
        data.toWarehouseId,
        Math.abs(data.quantity),
        data.reason,
        data.notes
      );
      if (transferRes.error) {
        return { success: false, error: transferRes.error };
      }
      revalidatePath("/admin/inventory/movement");
      revalidatePath("/admin/inventory/stock");
      return { success: true };
    }

    const supabase = createAdminClient();
    const isPositive = ["RECEIVE", "IN", "RETURN"].includes(data.movementType);
    const delta = isPositive ? Math.abs(data.quantity) : -Math.abs(data.quantity);

    const { data: existing, error: fetchErr } = await supabase
      .from("inventory_levels")
      .select("id, quantity_available")
      .eq("variant_id", data.variantId)
      .eq("warehouse_id", data.warehouseId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const previousQuantity = existing?.quantity_available || 0;
    const newQuantity = previousQuantity + delta;

    if (newQuantity < 0) {
      return {
        success: false,
        error: `Insufficient stock in warehouse. Current available: ${previousQuantity}, requested reduction: ${Math.abs(delta)}.`,
      };
    }

    if (existing) {
      const { error: updateErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) throw updateErr;
    } else {
      if (delta < 0) {
        return { success: false, error: "No existing inventory found to deduct stock from." };
      }
      const { error: insertErr } = await supabase
        .from("inventory_levels")
        .insert({
          variant_id: data.variantId,
          warehouse_id: data.warehouseId,
          quantity_available: delta,
          quantity_reserved: 0,
        });
      if (insertErr) throw insertErr;
    }

    const standardType =
      data.movementType === "IN" ? "RECEIVE" :
      data.movementType === "OUT" ? "DAMAGE" :
      data.movementType === "ADJUSTMENT" ? "ADJUST" :
      data.movementType;

    try {
      await supabase.from("stock_movements").insert({
        variant_id: data.variantId,
        warehouse_id: data.warehouseId,
        quantity_change: delta,
        reason: data.notes || data.reason,
        reason_code: data.reason,
      });
    } catch (e: any) {
      console.warn("Could not insert stock_movements log:", e?.message);
    }

    revalidatePath("/admin/inventory/movement");
    revalidatePath("/admin/inventory/stock");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record movement" };
  }
}

export async function createAuditAction(data: {
  warehouse_id: string;
  blind_count?: boolean;
  scheduled_date?: string;
  notes?: string;
  zone_id?: string;
}) {
  try {
    const service = new InventoryService();
    const audit = await service.createAudit({
      warehouse_id: data.warehouse_id,
      zone_id: data.zone_id,
      blind_count: !!data.blind_count,
      status: "SCHEDULED",
    });
    try {
      revalidatePath("/admin/inventory/audits");
    } catch {}
    return { success: true, data: audit };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to schedule audit" };
  }
}

export async function updateAuditStatusAction(
  id: string,
  status: "PLANNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
) {
  try {
    const service = new InventoryService();
    const dbStatus = status === "PLANNED" ? "SCHEDULED" : status;
    await service.updateAuditStatus(id, dbStatus);
    try {
      revalidatePath("/admin/inventory/audits");
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update audit status" };
  }
}

