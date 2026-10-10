import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number; // Percentage change (e.g., 5.2, -3.1, 0)
  invertColors?: boolean; // If true, up is red, down is green (e.g., for bounce rate or churn)
  className?: string;
}

export function TrendIndicator({
  value,
  invertColors = false,
  className,
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const isNegative = value < 0;

  const colorClass = isNeutral
    ? "text-gray-500 bg-gray-100"
    : (isPositive && !invertColors) || (isNegative && invertColors)
      ? "text-emerald-700 bg-emerald-100"
      : "text-rose-700 bg-rose-100";

  const Icon = isNeutral ? MinusIcon : isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <Icon className="mr-1 h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}
