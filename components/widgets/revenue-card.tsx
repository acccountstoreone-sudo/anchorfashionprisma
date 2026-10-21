import * as React from "react";
import { StatsCard } from "@/components/data-display/stats-card";
import { DollarSign } from "lucide-react";

export function RevenueCard({
  value,
  trend,
}: {
  value: string;
  trend: number;
}) {
  return (
    <StatsCard
      title="Total Revenue"
      value={value}
      icon={<DollarSign className="h-4 w-4" />}
      trend={{ value: trend, isUpward: trend > 0 }}
      description="from last month"
    />
  );
}
