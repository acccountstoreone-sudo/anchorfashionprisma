/**
 * Cron Route: Release Expired Inventory Reservations
 *
 * Finds PENDING_PAYMENT orders whose reservation_expires_at has passed,
 * releases their reserved stock via the atomic release_order_inventory RPC,
 * and marks the orders as CANCELLED.
 *
 * Security: requires Bearer token matching CRON_SECRET env var.
 * The same pattern is used by the existing /api/cron/process-queue route.
 *
 * Schedule: add to vercel.json — recommended every 5 minutes.
 * This endpoint is idempotent: calling it multiple times is always safe.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { InventoryService } from "@/services/inventory.service";
import { CouponService } from "@/services/coupon.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ── Security check ─────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const inventoryService = new InventoryService();

  try {
    // ── Find expired PENDING_PAYMENT orders ───────────────────────────────
    const { data: expiredOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("status", "pending_payment") // lowercase matches OMS enum
      .lt("reservation_expires_at", new Date().toISOString())
      .not("reservation_expires_at", "is", null);

    if (fetchError) {
      console.error("[cron/release-expired-reservations] Fetch error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch expired orders" }, { status: 500 });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: "No expired reservations found", released: 0 });
    }

    let released = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const order of expiredOrders) {
      try {
        // Release inventory atomically via RPC — idempotent.
        await inventoryService.releaseOrderInventory(order.id);
        
        // Release coupon usage automatically
        await CouponService.releaseCoupon(order.id);

        // Cancel the order. Use service_role client so RLS doesn't block.
        const { error: cancelError } = await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id)
          .eq("status", "pending_payment"); // guard: only cancel if still pending

        if (cancelError) {
          // Non-fatal: inventory was released, but status update failed.
          // Will be retried on next cron run (release is idempotent).
          errors.push(`Order ${order.order_number}: status update failed — ${cancelError.message}`);
          console.error(`[cron] Failed to cancel order ${order.id}:`, cancelError);
        } else {
          released++;
        }
      } catch (releaseErr: unknown) {
        failed++;
        const msg = releaseErr instanceof Error ? releaseErr.message : String(releaseErr);
        errors.push(`Order ${order.order_number}: ${msg}`);
        console.error(`[cron] Failed to release reservation for order ${order.id}:`, releaseErr);
      }
    }

    return NextResponse.json({
      message: "Expired reservation sweep complete",
      found: expiredOrders.length,
      released,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/release-expired-reservations] Unexpected error:", err);
    return NextResponse.json({ error: `Internal error: ${message}` }, { status: 500 });
  }
}
