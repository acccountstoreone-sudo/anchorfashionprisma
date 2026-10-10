"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function lookupBarcodeAction(query: string) {
  try {
    const trimmed = query.trim();
    if (!trimmed) {
      return { success: false, error: "Please enter a barcode or SKU to search." };
    }

    const supabase = createAdminClient();

    // 1. Search variant by barcode or SKU
    let { data: variant, error: varError } = await supabase
      .from("variants")
      .select(`
        id,
        sku,
        barcode,
        price_override,
        sale_price,
        attributes,
        product:products(
          id,
          name,
          slug,
          base_price,
          status,
          sku
        ),
        inventory_levels(
          id,
          quantity_available,
          quantity_reserved,
          reorder_point,
          warehouse_id,
          warehouse:warehouses(id, name, warehouse_code)
        )
      `)
      .or(`barcode.ilike.%${trimmed}%,sku.ilike.%${trimmed}%`)
      .limit(1)
      .maybeSingle();

    if (varError) throw varError;

    if (!variant) {
      // Try searching product SKU if variant not directly matched
      const { data: product } = await supabase
        .from("products")
        .select("id, name, slug, base_price, sku")
        .ilike("sku", `%${trimmed}%`)
        .limit(1)
        .maybeSingle();

      if (product) {
        const { data: firstVariant } = await supabase
          .from("variants")
          .select(`
            id,
            sku,
            barcode,
            attributes,
            inventory_levels(
              id,
              quantity_available,
              quantity_reserved,
              reorder_point,
              warehouse_id,
              warehouse:warehouses(id, name, warehouse_code)
            )
          `)
          .eq("product_id", product.id)
          .limit(1)
          .maybeSingle();

        if (firstVariant) {
          variant = {
            ...firstVariant,
            product,
          } as any;
        }
      }
    }

    if (!variant) {
      return {
        success: false,
        error: `No product or variant found matching "${trimmed}".`,
      };
    }

    // Fetch all active warehouses for quick adjustment dropdown
    const { data: rawWarehouses } = await supabase
      .from("warehouses")
      .select("id, name, warehouse_code")
      .eq("is_active", true);

    const warehouses = (rawWarehouses || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      code: w.warehouse_code || "",
      warehouse_code: w.warehouse_code || "",
    }));

    return {
      success: true,
      data: {
        variant,
        warehouses,
      },
    };
  } catch (err: any) {
    console.error("[lookupBarcodeAction]", err);
    return { success: false, error: err.message || "Failed to lookup barcode" };
  }
}

export async function adjustScannedStockAction({
  variantId,
  warehouseId,
  deltaQuantity,
  movementType = "IN",
  note,
}: {
  variantId: string;
  warehouseId: string;
  deltaQuantity: number;
  movementType?: "IN" | "OUT" | "ADJUSTMENT";
  note?: string;
}) {
  try {
    if (!variantId || !warehouseId) {
      return { success: false, error: "Variant and warehouse must be specified." };
    }

    if (deltaQuantity === 0) {
      return { success: false, error: "Adjustment quantity cannot be zero." };
    }

    const supabase = createAdminClient();

    // 1. Fetch current inventory level
    const { data: currentLevel } = await supabase
      .from("inventory_levels")
      .select("id, quantity_available, quantity_reserved")
      .eq("variant_id", variantId)
      .eq("warehouse_id", warehouseId)
      .maybeSingle();

    const prevQty = currentLevel?.quantity_available || 0;
    let newQty: number;

    if (movementType === "IN") {
      newQty = prevQty + Math.abs(deltaQuantity);
    } else if (movementType === "OUT") {
      newQty = Math.max(0, prevQty - Math.abs(deltaQuantity));
    } else {
      // ADJUSTMENT: deltaQuantity represents absolute change (+ or -) or target
      newQty = Math.max(0, prevQty + deltaQuantity);
    }

    // 2. Upsert inventory level
    if (currentLevel?.id) {
      const { error: updErr } = await supabase
        .from("inventory_levels")
        .update({
          quantity_available: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentLevel.id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from("inventory_levels").insert({
        variant_id: variantId,
        warehouse_id: warehouseId,
        quantity_available: newQty,
        quantity_reserved: 0,
        reorder_point: 5,
      });

      if (insErr) throw insErr;
    }

    // 3. Record stock movement
    const actualDelta = newQty - prevQty;
    try {
      await supabase.from("stock_movements").insert({
        variant_id: variantId,
        warehouse_id: warehouseId,
        quantity_change: actualDelta,
        reason: note || `Scan station quick ${movementType.toLowerCase()} (${actualDelta > 0 ? "+" : ""}${actualDelta})`,
        reason_code: movementType,
        reference_id: "SCAN-STATION",
      });
    } catch (e: any) {
      console.warn("Could not insert stock_movements log:", e?.message);
    }

    revalidatePath("/admin/operations/scan");
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");

    return {
      success: true,
      data: {
        previousQuantity: prevQty,
        newQuantity: newQty,
        delta: actualDelta,
      },
    };
  } catch (err: any) {
    console.error("[adjustScannedStockAction]", err);
    return { success: false, error: err.message || "Failed to adjust stock" };
  }
}
