import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CourierFactory } from "@/lib/couriers/courier.factory";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courierId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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
