import { NextRequest, NextResponse } from "next/server";
import { InventoryRepository } from "@/repositories/inventory.repository";
import { verifyStaff } from "@/lib/security/roles";

export async function POST(request: NextRequest) {
  try {
    await verifyStaff();
    const body = await request.json();
    if (!body.variant_id || !body.warehouse_id || !body.quantity) {
      return NextResponse.json(
        { error: "Missing required fields: variant_id, warehouse_id, quantity" },
        { status: 400 }
      );
    }

    const repo = new InventoryRepository();
    const result = await repo.stockIn(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message?.includes("Forbidden") ? 403 : 400 });
  }
}
