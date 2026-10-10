import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouse_id") || undefined;
    const supabase = createAdminClient();

    let query = supabase
      .from("inventory_levels")
      .select(
        `*,
        variant:variants(
          id,
          sku,
          barcode,
          product:products(id, name, base_price)
        ),
        warehouse:warehouses(id, name, warehouse_code)`
      );

    if (warehouseId) {
      query = query.eq("warehouse_id", warehouseId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const lowStockItems = (data || [])
      .filter((row: any) => {
        const avail = Number(row.quantity_available) || 0;
        const threshold = Number(row.reorder_point) || Number(row.safety_stock) || 5;
        return avail <= threshold;
      })
      .map((row: any) => ({
        id: row.id,
        variant_id: row.variant_id,
        sku: row.variant?.sku || "—",
        product_name: row.variant?.product?.name || "Product",
        warehouse_name: row.warehouse?.name || "Warehouse",
        warehouse_code: row.warehouse?.warehouse_code || "",
        quantity_available: row.quantity_available,
        quantity_reserved: row.quantity_reserved,
        reorder_point: row.reorder_point,
        safety_stock: row.safety_stock,
        is_out_of_stock: (row.quantity_available || 0) <= 0,
      }));

    return NextResponse.json({
      total: lowStockItems.length,
      items: lowStockItems,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
