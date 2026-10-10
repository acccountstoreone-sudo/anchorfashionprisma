import { NextRequest, NextResponse } from "next/server";
import { WarehouseService } from "@/services/warehouse.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = new WarehouseService();
    const racks = await service.getRacksByZone(id);
    return NextResponse.json(racks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const service = new WarehouseService();
    const rack = await service.createRack(id, body);
    return NextResponse.json(rack, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
