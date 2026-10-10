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
  ShoppingCart,
  Users,
  Tag,
  Package,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { AnalyticsFilters } from "@/features/analytics/components/AnalyticsFilters";
import { SalesTrendChart } from "@/features/analytics/components/Charts";
import { getExecutiveSummaryAction } from "@/app/actions/analytics/dashboard.actions";
import { subDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Executive Dashboard | Anchor Fashion Analytics",
  description: "High-level business intelligence metrics",
};

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboardPage({
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

  const { data: summary, error } = await getExecutiveSummaryAction({
    from,
    to,
  });

  if (error || !summary) {
    return (
      <div className="p-8 text-red-500">
        Failed to load executive summary: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-muted-foreground">
            Core performance indicators and financial health.
          </p>
        </div>
      </div>

      <AnalyticsFilters />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(summary.todaysRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Weekly Revenue"
          value={formatCurrency(summary.weeklyRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(summary.monthlyRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Yearly Revenue"
          value={formatCurrency(summary.yearlyRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Gross Profit"
          value={formatCurrency(summary.grossProfit)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(summary.netProfit)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Avg. Order Value"
          value={formatCurrency(summary.averageOrderValue)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Total Orders"
          value={summary.totalOrders.toLocaleString()}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <StatCard
          title="Total Customers"
          value={summary.totalCustomers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Active Customers"
          value={summary.activeCustomers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Products Catalog"
          value={summary.productsCount.toLocaleString()}
          icon={<Tag className="h-4 w-4" />}
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(summary.inventoryValue)}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <SalesTrendChart
          title="Revenue Trend"
          description="Daily revenue performance for the selected period"
          data={summary.revenueHistory}
        />
      </div>
    </div>
  );
}
