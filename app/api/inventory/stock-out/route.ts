import { NextRequest, NextResponse } from "next/server";
import { InventoryRepository } from "@/repositories/inventory.repository";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.variant_id || !body.warehouse_id || !body.quantity) {
      return NextResponse.json(
        { error: "Missing required fields: variant_id, warehouse_id, quantity" },
        { status: 400 }
      );
    }

    const repo = new InventoryRepository();
    const result = await repo.stockOut({
      variant_id: body.variant_id,
      warehouse_id: body.warehouse_id,
      bin_id: body.bin_id,
      quantity: body.quantity,
      reason: body.reason || "STOCK_OUT",
      notes: body.notes,
      reference_id: body.reference_id,
    });
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
