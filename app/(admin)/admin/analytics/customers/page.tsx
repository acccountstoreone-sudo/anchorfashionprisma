import { Metadata } from "next";
import { Users, UserPlus, UserCheck, Activity } from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { AnalyticsFilters } from "@/features/analytics/components/AnalyticsFilters";
import {
  SalesTrendChart,
  SimplePieChart,
} from "@/features/analytics/components/Charts";
import { getCustomerAnalyticsAction } from "@/app/actions/analytics/dashboard.actions";
import { subDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customer Analytics | Anchor Fashion Analytics",
  description: "Customer demographics and retention analytics",
};

export const dynamic = "force-dynamic";

export default async function CustomerAnalyticsPage({
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

  const { data: customers, error } = await getCustomerAnalyticsAction({
    from,
    to,
  });

  if (error || !customers) {
    return (
      <div className="p-8 text-red-500">
        Failed to load customer analytics: {error}
      </div>
    );
  }

  const mappedGrowth = customers.customerGrowth.map((c: any) => ({
    date: c.date,
    revenue: c.customers, // reusing the revenue chart for customer growth trend
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Customer Analytics
          </h1>
          <p className="text-muted-foreground">
            Retention, lifetime value, and segmentation.
          </p>
        </div>
      </div>

      <AnalyticsFilters />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={customers.totalCustomers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="New Customers"
          value={customers.newCustomers.toLocaleString()}
          icon={<UserPlus className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          title="Returning Customers"
          value={customers.returningCustomers.toLocaleString()}
          icon={<UserCheck className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          title="Average LTV"
          value={formatCurrency(customers.averageLifetimeValue)}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <SalesTrendChart
          title="Customer Growth"
          description="New registrations over time"
          data={mappedGrowth}
        />
        <SimplePieChart
          title="Customer Segmentation"
          data={customers.customerSegments}
        />
      </div>
    </div>
  );
}
