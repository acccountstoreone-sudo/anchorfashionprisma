import { NextResponse } from "next/server";
import { CourierFactory } from "@/lib/couriers/courier.factory";
import { verifyStaff } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courierId: string }> }
) {
  try {
    await verifyStaff();

    const { courierId } = await params;
    const { provider } = await CourierFactory.getProviderFromDatabase(courierId);
    const health = await provider.healthCheck();

    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TEST_CONNECTION_FAILED",
          message: err.message || "Failed to test courier connection",
        },
      },
      { status: 500 }
    );
  }
}
