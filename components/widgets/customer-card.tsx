import * as React from "react";
import { StatsCard } from "@/components/data-display/stats-card";
import { Users } from "lucide-react";

export function CustomerCard({
  value,
  trend,
}: {
  value: string;
  trend: number;
}) {
  return (
    <StatsCard
      title="Active Customers"
      value={value}
      icon={<Users className="h-4 w-4" />}
      trend={{ value: trend, isUpward: trend > 0 }}
      description="from last month"
    />
  );
}
