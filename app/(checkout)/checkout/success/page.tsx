import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Package, Truck, Home, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Order Placed | Anchor Fashion",
  description: "Thank you for your purchase.",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order_id?: string; notice?: string; trxID?: string };
}) {
  const { order_id, notice, trxID } = await searchParams;

  if (!order_id) {
    redirect("/");
  }

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", order_id)
    .single();

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold">Order Not Found</h1>
        <p className="mb-8 text-slate-500">
          We couldn&apos;t find the details for this order.
        </p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  // Check server-authoritative payment confirmation state
  const isCOD = order.payment_method === "COD";
  const isServerConfirmedPaid =
    order.payment_status === "CAPTURED" ||
    order.status === "confirmed" ||
    order.status === "processing";

  // If order is digital payment and not yet confirmed by server validation/webhook, display Pending state
  const isPaymentPending =
    !isCOD &&
    (!isServerConfirmedPaid ||
      notice === "nagad_pending_crypto" ||
      notice === "payment_pending");

  if (isPaymentPending) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Payment verification is pending</h1>
          <p className="mb-4 text-slate-600 font-medium">
            Order: <span className="font-semibold text-slate-900">{order.order_number}</span>
          </p>
          <p className="mb-4 text-slate-500">
            Your order has been received, but your payment verification is pending confirmation from the payment gateway.
          </p>
          <p className="mb-8 text-sm text-slate-500">
            Once confirmed by the gateway or IPN notification, your order will automatically transition to processing.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/account/orders">View My Orders</Link>
            </Button>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const transactionId = trxID || order.payment_intent_id;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h1 className="mb-1 text-3xl font-bold text-slate-900">Payment successful</h1>
        <p className="mb-4 text-lg font-medium text-emerald-700">Order confirmed</p>
        <p className="mb-4 text-slate-500">
          Your order{" "}
          <span className="font-semibold text-slate-900">
            {order.order_number}
          </span>{" "}
          has been confirmed successfully.
        </p>

        {transactionId && (
          <div className="mx-auto mb-6 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Payment Verified via {order.payment_method || "Gateway"}
            </p>
            <p className="mt-1 font-mono text-sm text-emerald-950">
              Transaction ID: <span className="font-bold">{transactionId}</span>
            </p>
          </div>
        )}

        <p className="mb-8 text-sm text-slate-500">
          We&apos;ve sent a confirmation email with your order details and tracking
          information.
        </p>

        {/* Order Timeline */}
        <div className="relative mx-auto mb-12 flex max-w-md items-center justify-between">
          <div className="absolute left-0 top-1/2 -z-10 h-1 w-full -translate-y-1/2 transform bg-slate-100"></div>

          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Processing</span>
          </div>

          <div className="flex flex-col items-center opacity-40">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Shipped</span>
          </div>

          <div className="flex flex-col items-center opacity-40">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Delivered</span>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/account/orders">View My Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
