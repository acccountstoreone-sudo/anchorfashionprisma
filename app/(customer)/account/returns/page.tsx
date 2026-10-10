import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReturnsService } from "@/services/shipping/returns.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Returns & Exchanges | Anchor Fashion",
  description: "View and track your return and exchange requests.",
};

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; colorClass: string }
> = {
  requested: {
    label: "Requested",
    variant: "secondary",
    colorClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
  approved: {
    label: "Approved",
    variant: "secondary",
    colorClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  pickup_scheduled: {
    label: "Pickup Scheduled",
    variant: "secondary",
    colorClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  picked_up: {
    label: "In Transit",
    variant: "secondary",
    colorClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  in_transit: {
    label: "In Transit",
    variant: "secondary",
    colorClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  received: {
    label: "Received at Warehouse",
    variant: "secondary",
    colorClass: "bg-sky-100 text-sky-800 border-sky-200",
  },
  inventory_synced: {
    label: "Inspected",
    variant: "secondary",
    colorClass: "bg-teal-100 text-teal-800 border-teal-200",
  },
  completed: {
    label: "Completed",
    variant: "default",
    colorClass: "bg-green-100 text-green-800 border-green-200",
  },
  refunded: {
    label: "Refunded",
    variant: "default",
    colorClass: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    colorClass: "bg-red-100 text-red-800 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline",
    colorClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default async function CustomerReturnsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account/returns");
  }

  const service = new ReturnsService();
  const returns = await service.getCustomerReturns(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Returns & Exchanges
          </h1>
          <p className="text-sm text-slate-500">
            Track reverse logistics, return approvals, and refund statuses.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/account/orders">
            <ShoppingBag className="mr-2 h-4 w-4" />
            View Orders to Return
          </Link>
        </Button>
      </div>

      {returns.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <RefreshCcw className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                No Return Requests
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                You haven&apos;t requested any returns or exchanges yet.
              </p>
            </div>
            <Button asChild>
              <Link href="/account/orders">View My Orders</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {returns.map((ret: any) => {
            const badgeInfo =
              STATUS_BADGES[ret.status.toLowerCase()] || STATUS_BADGES.requested;
            const itemsCount = ret.items?.length || 0;
            const itemsTotalQty = (ret.items || []).reduce(
              (sum: number, it: any) => sum + (it.quantity || 1),
              0
            );

            return (
              <Card
                key={ret.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <RefreshCcw className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">
                          {ret.return_number}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Requested on {new Date(ret.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${badgeInfo.colorClass}`}
                      >
                        {badgeInfo.label}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col justify-between gap-4 border-t pt-3 sm:flex-row sm:items-center">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-slate-800">
                        Reason: <span className="font-normal">{ret.reason}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {itemsCount} {itemsCount === 1 ? "product" : "products"} (
                        {itemsTotalQty} total {itemsTotalQty === 1 ? "item" : "items"})
                        {ret.exchange_requested ? " · Exchange" : " · Return & Refund"}
                      </p>
                      {Number(ret.refund_amount) > 0 && (
                        <p className="text-xs font-semibold text-slate-700">
                          Refund Amount: {formatCurrency(ret.refund_amount)}{" "}
                          <span className="text-[10px] text-slate-500">
                            ({ret.refund_status || "PENDING"})
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/account/returns/${ret.id}`}>
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
