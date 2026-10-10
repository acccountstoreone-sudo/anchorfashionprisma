import { NextRequest, NextResponse } from "next/server";
import { AlphaSmsService } from "@/lib/services/sms/alpha-sms.service";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * POST /api/orders/:orderId/send-confirmation-sms
 * Triggers or resends confirmation SMS for a confirmed order
 * Query params: ?force=true (bypass duplicate check, staff/admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId in route" }, { status: 400 });
    }

    let user: any = null;
    try {
      const supabase = await createClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (!authError && data?.user) {
        user = data.user;
      }
    } catch {
      // Cookies context unavailable or threw
    }

    if (!user) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const adminSupabase = createAdminClient();
        const { data: tokenData } = await adminSupabase.auth.getUser(token);
        if (tokenData?.user) {
          user = tokenData.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: order } = await adminSupabase
      .from("orders")
      .select("id, customer_id, created_by")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const role = (user.app_metadata?.role || user.user_metadata?.role || "").toLowerCase();
    const isStaffOrAdmin = [
      "admin",
      "superadmin",
      "super_admin",
      "manager",
      "ops_manager",
      "inventory_manager",
      "staff",
      "warehouse_staff",
    ].includes(role);
    const isOwner = order.customer_id === user.id || order.created_by === user.id;

    if (!isStaffOrAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const force = isStaffOrAdmin && searchParams.get("force") === "true";

    const result = await AlphaSmsService.sendOrderConfirmationSMS(orderId, {
      force,
    });

    return NextResponse.json(
      {
        success: result.success,
        status: result.status,
        recipient: result.phone,
        message: result.message,
        requestId: result.requestId || null,
        skipped: !!result.skipped,
        reason: result.reason || null,
        error: result.error || null,
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error: any) {
    console.error("POST /api/orders/:orderId/send-confirmation-sms exception:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
