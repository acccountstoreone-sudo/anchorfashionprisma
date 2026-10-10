import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export const dynamic = "force-dynamic";

export async function GET(
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
    const adminSupabase = createAdminClient();

    // Look up courier code
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        courierId
      );

    let courierCode = courierId;
    if (isUuid) {
      const { data: record } = await adminSupabase
        .from("courier_providers")
        .select("code")
        .eq("id", courierId)
        .maybeSingle();
      if (record?.code) {
        courierCode = record.code;
      }
    }

    const { data: logs, error: logsError } = await adminSupabase
      .from("courier_api_logs")
      .select("*")
      .eq("courier_code", courierCode)
      .order("created_at", { ascending: false })
      .limit(50);

    if (logsError) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve logs" },
      { status: 500 }
    );
  }
}
