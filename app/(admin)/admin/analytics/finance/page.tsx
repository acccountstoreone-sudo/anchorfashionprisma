import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveKpiCard } from "@/components/admin/analytics/kpi/LiveKpiCard";
import { AreaChartVariant } from "@/components/admin/analytics/charts/AreaChartVariant";
import { DollarSign, Percent, TrendingDown, Wallet } from "lucide-react";
import { getSalesTrends } from "@/lib/analytics/queries";
import { AnalyticsRepository } from "@/repositories/analytics.repository";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 60;

export default async function FinanceAnalyticsPage() {
  const trends = await getSalesTrends();
  const summary = await AnalyticsRepository.getExecutiveSummary();

  const operatingExpenses = summary.grossProfit - summary.netProfit;
  const profitMargin = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LiveKpiCard
          title="Gross Profit"
          value={formatCurrency(summary.grossProfit)}
          icon={<DollarSign />}
          trend={summary.revenueTrend} // Proxying revenue trend for gross profit trend
        />
        <LiveKpiCard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          icon={<Percent />}
          trend={0} // Complex to calculate prev margin without deep dive, keeping neutral for now
        />
        <LiveKpiCard
          title="Operating Expenses"
          value={formatCurrency(operatingExpenses)}
          icon={<TrendingDown />}
          trend={0}
          invertColors
        />
        <LiveKpiCard
          title="Net Profit"
          value={formatCurrency(summary.netProfit)}
          icon={<Wallet />}
          trend={summary.revenueTrend} // Proxying revenue trend
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Profit vs Revenue</CardTitle>
            <CardDescription>Margin analysis over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Reusing salesTrends to show profit trend, in a real scenario this might be a composed chart */}
            <AreaChartVariant
              data={trends}
              xDataKey="date"
              yDataKey="profit"
              valueFormatter="currency"
              color="#059669"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
