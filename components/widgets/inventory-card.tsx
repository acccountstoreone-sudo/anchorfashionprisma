import * as React from "react";
import { StatsCard } from "@/components/data-display/stats-card";
import { Package } from "lucide-react";

export function InventoryCard({
  value,
  lowStockCount,
}: {
  value: string;
  lowStockCount: number;
}) {
  return (
    <StatsCard
      title="Inventory Items"
      value={value}
      icon={<Package className="h-4 w-4" />}
      description={`${lowStockCount} items low in stock`}
    />
  );
}
