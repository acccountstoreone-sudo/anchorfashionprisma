import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
} from "lucide-react";
import { RevenueChart } from "@/components/manager/dashboard/RevenueChart";
import {
  fetchDashboardKPIsAction,
  fetchDashboardRevenueAction,
  fetchTopSellersAction,
} from "@/app/actions/bi/dashboard.actions";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { ExportReportButton } from "./ExportReportButton";

export const metadata: Metadata = {
  title: "Reports & Analytics | Manager Dashboard",
  description: "Comprehensive business performance metrics and real-time reports.",
};

interface ReportsPageProps {
  searchParams: Promise<{ days?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedParams = await searchParams;
  const daysNum = resolvedParams.days ? parseInt(resolvedParams.days, 10) : 30;
  const days = isNaN(daysNum) || daysNum <= 0 ? 30 : daysNum;

  const [kpisRes, revenueRes, topSellersRes] = await Promise.all([
    fetchDashboardKPIsAction(),
    fetchDashboardRevenueAction(days),
    fetchTopSellersAction(),
  ]);

  const rawKpis = kpisRes.data || {
    revenue: { value: 0, trend: { value: 0, isPositive: true } },
    orders: { value: 0, trend: { value: 0, isPositive: true } },
    aov: { value: 0, trend: { value: 0, isPositive: true } },
    newCustomers: { value: 0, trend: { value: 0, isPositive: true } },
  };

  const topSellers = topSellersRes.data || [];
  const totalItemsSold = topSellers.reduce(
    (sum: number, p: any) => sum + (Number(p.sold) || 0),
    0
  );

  const revenueChartData = (revenueRes.data || []).map((d: any) => ({
    name: d.name,
    total: d.revenue,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Comprehensive real-time insights into your store's performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            <Link
              href="/manager/reports?days=7"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                days === 7
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              7 Days
            </Link>
            <Link
              href="/manager/reports?days=30"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                days === 30
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              30 Days
            </Link>
            <Link
              href="/manager/reports?days=90"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                days === 90
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              90 Days
            </Link>
          </div>

          <ExportReportButton
            kpis={{
              totalRevenue: rawKpis.revenue.value,
              totalOrders: rawKpis.orders.value,
              aov: rawKpis.aov.value,
              newCustomers: rawKpis.newCustomers.value,
            }}
            topSellers={topSellers}
            days={days}
          />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(rawKpis.revenue.value)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rawKpis.revenue.trend?.value
                ? `${rawKpis.revenue.trend.isPositive ? "+" : "-"}${rawKpis.revenue.trend.value}% from previous period`
                : "All-time aggregated store sales"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(rawKpis.aov.value)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {formatNumber(rawKpis.orders.value)} completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(rawKpis.newCustomers.value)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered customer profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalItemsSold)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items dispatched across catalog
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={revenueChartData} />

        <Card className="col-span-1 lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>
              Best performing catalog items based on real transaction data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topSellers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No product sales recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {topSellers.map((product: any, i: number) => (
                  <div
                    key={product.product_id || i}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted font-bold text-muted-foreground">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {product.product_name || "Product"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {product.sold || 0} units sold •{" "}
                          {product.category_name || "Apparel"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(product.earnings || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
