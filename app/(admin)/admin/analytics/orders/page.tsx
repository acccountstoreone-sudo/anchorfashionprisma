import { Metadata } from "next";
import { ShoppingBag, XCircle, RotateCcw, Box, DollarSign } from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { AnalyticsFilters } from "@/features/analytics/components/AnalyticsFilters";
import {
  StatusDistributionChart,
  SimplePieChart,
} from "@/features/analytics/components/Charts";
import { getOrderAnalyticsAction } from "@/app/actions/analytics/dashboard.actions";
import { subDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order Analytics | Anchor Fashion Analytics",
  description: "Fulfillment and order status analytics",
};

export const dynamic = "force-dynamic";

export default async function OrderAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const from = resolvedSearchParams.from
    ? new Date(resolvedSearchParams.from)
    : subDays(new Date(), 30);
  const to = resolvedSearchParams.to
    ? new Date(resolvedSearchParams.to)
    : new Date();

  const { data: orders, error } = await getOrderAnalyticsAction({ from, to });

  if (error || !orders) {
    return (
      <div className="p-8 text-red-500">
        Failed to load order analytics: {error}
      </div>
    );
  }

  const pendingOrders =
    (orders.statusCounts["pending"] || 0) +
    (orders.statusCounts["processing"] || 0);
  const shippedOrders = orders.statusCounts["shipped"] || 0;
  const deliveredOrders = orders.statusCounts["delivered"] || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Analytics</h1>
          <p className="text-muted-foreground">
            Fulfillment pipelines, returns, and refund statistics.
          </p>
        </div>
      </div>

      <AnalyticsFilters />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={orders.total.toLocaleString()}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Fulfillment"
          value={pendingOrders.toLocaleString()}
          icon={<Box className="h-4 w-4" />}
        />
        <StatCard
          title="Returns & Cancellations"
          value={orders.refundStatistics.count.toLocaleString()}
          icon={<RotateCcw className="h-4 w-4 text-red-500" />}
        />
        <StatCard
          title="Total Refunded"
          value={formatCurrency(orders.refundStatistics.totalAmount)}
          icon={<DollarSign className="h-4 w-4 text-red-500" />}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <StatusDistributionChart
          title="Orders by Status"
          description="Distribution of orders across fulfillment stages"
          data={orders.statuses}
        />
        <SimplePieChart
          title="Order Success Rate"
          data={[
            {
              name: "Successful (Delivered/Shipped)",
              value: shippedOrders + deliveredOrders,
            },
            { name: "In Progress", value: pendingOrders },
            {
              name: "Failed (Returned/Cancelled)",
              value: orders.refundStatistics.count,
            },
          ]}
        />
      </div>
    </div>
  );
}
