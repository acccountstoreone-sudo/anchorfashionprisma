import * as React from "react";
import { StatsCard } from "@/components/data-display/stats-card";
import { ShoppingCart } from "lucide-react";

export function OrderCard({ value, trend }: { value: string; trend: number }) {
  return (
    <StatsCard
      title="Total Orders"
      value={value}
      icon={<ShoppingCart className="h-4 w-4" />}
      trend={{ value: trend, isUpward: trend > 0 }}
      description="from last month"
    />
  );
}
