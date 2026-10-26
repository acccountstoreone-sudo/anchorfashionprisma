import { NextRequest, NextResponse } from "next/server";
import { WarehouseService } from "@/services/warehouse.service";
import { verifyStaff, verifyManager } from "@/lib/security/roles";

export async function GET(request: NextRequest) {
  try {
    await verifyStaff();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const type = searchParams.get("type") || undefined;
    const location = searchParams.get("location") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || undefined;
    const sortOrder = (searchParams.get("sortOrder") as any) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const service = new WarehouseService();
    const result = await service.getAllWarehouses({
      search,
      status,
      type,
      location,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message?.includes("Forbidden") ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyManager();
    const body = await request.json();
    const service = new WarehouseService();
    const warehouse = await service.createWarehouse(body);
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message?.includes("Forbidden") ? 403 : 400 });
  }
}
