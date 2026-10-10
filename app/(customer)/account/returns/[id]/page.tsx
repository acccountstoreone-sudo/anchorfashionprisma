import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReturnsService } from "@/services/shipping/returns.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  ShieldCheck,
  AlertCircle,
  Wallet,
  CreditCard,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Return Details | Anchor Fashion",
};

interface ReturnDetailPageProps {
  params: Promise<{ id: string }>;
}

const STEP_STAGES = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "picked_up", label: "In Transit" },
  { key: "received", label: "Received" },
  { key: "completed", label: "Resolved" },
];

function getStageIndex(status: string): number {
  const s = status.toLowerCase();
  if (s === "requested") return 0;
  if (s === "approved" || s === "pickup_scheduled") return 1;
  if (s === "picked_up" || s === "in_transit") return 2;
  if (s === "received" || s === "inventory_synced") return 3;
  if (s === "completed" || s === "refunded") return 4;
  return -1;
}

export default async function CustomerReturnDetailPage({
  params,
}: ReturnDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/account/returns/${id}`);
  }

  const service = new ReturnsService();
  let returnRecord: any = null;

  try {
    returnRecord = await service.getCustomerReturnDetail(id, user.id);
  } catch {
    notFound();
  }

  if (!returnRecord) {
    notFound();
  }

  const currentStageIndex = getStageIndex(returnRecord.status);
  const isRejected = returnRecord.status.toLowerCase() === "rejected";
  const isCancelled = returnRecord.status.toLowerCase() === "cancelled";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/account/returns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {returnRecord.return_number}
              </h1>
              <Badge
                variant={isRejected ? "destructive" : "secondary"}
                className="text-xs"
              >
                {returnRecord.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Submitted on {new Date(returnRecord.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/account/orders/${returnRecord.order_id}`}>
              <Package className="mr-2 h-4 w-4" />
              View Original Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Rejection / Cancellation Alert if applicable */}
      {isRejected && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Return Request Rejected</p>
            <p className="mt-1 text-sm">
              {returnRecord.rejection_reason ||
                returnRecord.notes ||
                "This return request does not meet our return acceptance policy."}
            </p>
          </div>
        </div>
      )}

      {/* Stepper Progress Bar (if not rejected) */}
      {!isRejected && !isCancelled && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative flex justify-between">
              <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-200" />
              {STEP_STAGES.map((step, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div
                    key={step.key}
                    className="relative flex flex-col items-center"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                        isPassed
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-semibold">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs ${
                        isCurrent
                          ? "font-bold text-primary"
                          : isPassed
                          ? "font-medium text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left 2 Cols: Returned Items & Photos */}
        <div className="space-y-6 md:col-span-2">
          {/* Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Returned Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {returnRecord.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        SKU: {item.sku} · Qty: <strong>{item.quantity}</strong>
                      </p>
                      {item.reason && (
                        <p className="text-xs text-slate-600">
                          Item Reason: {item.reason}
                        </p>
                      )}
                      {item.condition && item.condition !== "unknown" && (
                        <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          Condition: {item.condition.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {Number(item.refund_amount) > 0 && (
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(item.refund_amount)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Note & Reason Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">Primary Reason</p>
                <p className="text-slate-800">{returnRecord.reason}</p>
              </div>

              {returnRecord.customer_note && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Customer Note</p>
                  <p className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-700">
                    {returnRecord.customer_note}
                  </p>
                </div>
              )}

              {/* Photo Proof Gallery */}
              {returnRecord.photo_urls && returnRecord.photo_urls.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Uploaded Photo Proof ({returnRecord.photo_urls.length})
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {returnRecord.photo_urls.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block h-20 w-20 overflow-hidden rounded-lg border bg-slate-100 transition-transform hover:scale-105"
                      >
                        <img
                          src={url}
                          alt={`Proof ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Financial & Reverse Logistics */}
        <div className="space-y-6">
          {/* Resolution & Refund Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Resolution & Refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Resolution</span>
                <span className="font-semibold text-slate-900">
                  {returnRecord.exchange_requested ? "Exchange" : "Return & Refund"}
                </span>
              </div>

              {!returnRecord.exchange_requested && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Refund Method</span>
                    <span className="font-medium text-slate-800">
                      {returnRecord.refund_method === "WALLET"
                        ? "Customer Wallet"
                        : "Original Payment"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Refund Status</span>
                    <Badge variant="outline" className="text-xs">
                      {returnRecord.refund_status || "PENDING"}
                    </Badge>
                  </div>

                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Authorized Refund</span>
                    <span className="text-emerald-600">
                      {formatCurrency(returnRecord.refund_amount || 0)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reverse Logistics Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Reverse Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {returnRecord.return_tracking_number ? (
                <div>
                  <p className="text-xs text-slate-500">Tracking Number</p>
                  <p className="font-mono text-xs font-semibold text-slate-900">
                    {returnRecord.return_tracking_number}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Truck className="h-4 w-4 text-slate-400" />
                  <span>Courier pickup will be scheduled after approval.</span>
                </div>
              )}

              {returnRecord.picked_up_at && (
                <div className="text-xs text-slate-500">
                  Picked up on:{" "}
                  {new Date(returnRecord.picked_up_at).toLocaleDateString()}
                </div>
              )}

              {returnRecord.received_at && (
                <div className="text-xs text-slate-500">
                  Received at warehouse:{" "}
                  {new Date(returnRecord.received_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guidelines Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Return Instructions</p>
            <p className="mt-1">
              Please preserve original tags, packaging, and invoice. The pickup agent
              will inspect the package before receiving it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
