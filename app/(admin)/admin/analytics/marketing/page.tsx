import { Metadata } from "next";
import { Megaphone, Mail, Percent, Tag, DollarSign } from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { AnalyticsFilters } from "@/features/analytics/components/AnalyticsFilters";
import { StatusDistributionChart } from "@/features/analytics/components/Charts";
import { getMarketingAnalyticsAction } from "@/app/actions/analytics/dashboard.actions";
import { subDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Marketing Analytics | Anchor Fashion Analytics",
  description: "Campaigns, coupons, and conversion tracking",
};

export const dynamic = "force-dynamic";

export default async function MarketingAnalyticsPage({
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

  const { data: marketing, error } = await getMarketingAnalyticsAction({
    from,
    to,
  });

  if (error || !marketing) {
    return (
      <div className="p-8 text-red-500">
        Failed to load marketing analytics: {error}
      </div>
    );
  }

  const formattedCoupons = marketing.topCoupons.map((c: any) => ({
    name: c.code,
    value: c.uses,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Marketing Analytics
          </h1>
          <p className="text-muted-foreground">
            Campaign performance, ROI, and customer engagement.
          </p>
        </div>
      </div>

      <AnalyticsFilters />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <StatCard
          title="Coupons Redeemed"
          value={marketing.couponsUsed.toLocaleString()}
          icon={<Tag className="h-4 w-4" />}
        />
        <StatCard
          title="Total Discounts Given"
          value={formatCurrency(marketing.totalDiscountGiven)}
          icon={<DollarSign className="h-4 w-4 text-red-500" />}
        />
        <StatCard
          title="Newsletter Subs"
          value={marketing.newsletterSubscribers.toLocaleString()}
          icon={<Mail className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <StatusDistributionChart
          title="Top Performing Coupons"
          description="Most used coupon codes during the selected period"
          data={formattedCoupons}
        />
      </div>
    </div>
  );
}
