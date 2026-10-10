import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  CreditCard,
  Truck,
  ShoppingCart,
  TrendingUp,
  Package,
  Layers,
} from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { AnalyticsFilters } from "@/features/analytics/components/AnalyticsFilters";
import {
  SalesTrendChart,
  SimplePieChart,
  StatusDistributionChart,
} from "@/features/analytics/components/Charts";
import { getSalesAnalyticsAction } from "@/app/actions/analytics/dashboard.actions";
import { subDays, format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Sales Analytics | Anchor Fashion Analytics",
  description: "Deep dive into sales performance",
};

export const dynamic = "force-dynamic";

export default async function SalesAnalyticsPage({
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

  const { data: sales, error } = await getSalesAnalyticsAction({ from, to });

  if (error || !sales) {
    return (
      <div className="p-8 text-red-500">
        Failed to load sales analytics: {error || "Unknown error"}
      </div>
    );
  }

  const topPayment =
    sales.paymentMethodSales && sales.paymentMethodSales.length > 0
      ? [...sales.paymentMethodSales].sort((a, b) => b.value - a.value)[0]
      : null;

  const topShipping =
    sales.shippingMethodSales && sales.shippingMethodSales.length > 0
      ? [...sales.shippingMethodSales].sort((a, b) => b.value - a.value)[0]
      : null;

  const totalOrders = sales.totalOrders || 0;
  const aov =
    sales.averageOrderValue ||
    (totalOrders > 0 ? Math.round(sales.totalSales / totalOrders) : 0);
  const dailyAverage =
    sales.dailySales && sales.dailySales.length > 0
      ? Math.round((sales.totalSales / sales.dailySales.length) * 100) / 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-muted-foreground">
            Real-time revenue breakdowns, payment methods, delivery zones, and product sales.
          </p>
        </div>
      </div>

      <AnalyticsFilters />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Sales"
          value={formatCurrency(sales.totalSales)}
          description={`From ${totalOrders} valid orders`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Total Orders"
          value={totalOrders.toString()}
          description={`${sales.cancelledOrdersCount || 0} cancelled/refunded`}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <StatCard
          title="Avg. Order Value"
          value={formatCurrency(aov)}
          description="Per confirmed order"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Daily Average"
          value={formatCurrency(dailyAverage)}
          description={`${sales.dailySales?.length || 0} active sales days`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Top Payment Method"
          value={topPayment ? topPayment.name : "N/A"}
          description={topPayment ? formatCurrency(topPayment.value) : "No transactions"}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Top Shipping Method"
          value={topShipping ? topShipping.name : "N/A"}
          description={topShipping ? formatCurrency(topShipping.value) : "No transactions"}
          icon={<Truck className="h-4 w-4" />}
        />
      </div>

      {/* Daily Sales Trend Chart */}
      <div className="mt-6 grid gap-4 grid-cols-1">
        <SalesTrendChart
          title="Sales Revenue Trend"
          description="Daily revenue performance for the selected date range"
          data={sales.dailySales || []}
        />
      </div>

      {/* Distribution Charts */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SimplePieChart
          title="Sales by Payment Method"
          description="Revenue distribution by payment gateway / COD"
          data={sales.paymentMethodSales || []}
        />
        <SimplePieChart
          title="Sales by Delivery Method"
          description="Revenue breakdown by shipping zone and speed"
          data={sales.shippingMethodSales || []}
        />
        <StatusDistributionChart
          title="Sales by Category"
          description="Revenue split across product categories"
          data={sales.categorySales || []}
        />
      </div>

      {/* Detail Tables: Top Selling Products & Recent Orders */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top Selling Products</CardTitle>
                <CardDescription>Best-performing items by generated revenue</CardDescription>
              </div>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {sales.topSellingProducts && sales.topSellingProducts.length > 0 ? (
              <div className="divide-y divide-border">
                {sales.topSellingProducts.map((prod: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-sm leading-none">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prod.quantity} {prod.quantity === 1 ? "unit" : "units"} sold
                      </p>
                    </div>
                    <div className="font-semibold text-sm">
                      {formatCurrency(prod.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No product sales data available for this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Real Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Sales Transactions</CardTitle>
                <CardDescription>Latest confirmed and delivered orders</CardDescription>
              </div>
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {sales.recentOrders && sales.recentOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {sales.recentOrders.map((ord: any) => (
                  <div key={ord.id} className="flex items-center justify-between py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{ord.orderNumber}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {ord.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ord.customerName} • {ord.createdAt ? format(new Date(ord.createdAt), "MMM dd, yyyy") : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(ord.amount)}</div>
                      <div className="text-[11px] text-muted-foreground uppercase">{ord.paymentMethod}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent transactions recorded for this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
