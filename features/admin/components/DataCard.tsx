"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Banknote, ShoppingBag, CreditCard, UserPlus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface DataCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  iconType?: "revenue" | "orders" | "aov" | "customers";
  iconBgColor?: string;
  iconTextColor?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  className?: string;
}

const iconPresetStyles: Record<
  NonNullable<DataCardProps["iconType"]>,
  { bg: string; text: string; spark: string }
> = {
  revenue: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    spark: "currentColor",
  },
  orders: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    spark: "currentColor",
  },
  aov: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    spark: "currentColor",
  },
  customers: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    spark: "currentColor",
  },
};

export function DataCard({
  title,
  value,
  description,
  icon,
  iconType,
  iconBgColor,
  iconTextColor,
  sparklineData = [10, 20, 15, 30, 25, 40, 35, 50, 40, 60],
  sparklineColor,
  className,
}: DataCardProps) {
  // Preset অনুযায়ী কালার ও আইকন নির্ধারণ
  const preset = iconType ? iconPresetStyles[iconType] : null;

  const resolvedBgColor = iconBgColor ?? preset?.bg ?? "bg-teal-500/10 dark:bg-teal-500/20";
  const resolvedTextColor = iconTextColor ?? preset?.text ?? "text-teal-600 dark:text-teal-400";
  const resolvedSparkColor = sparklineColor ?? "hsl(var(--primary))";

  let renderedIcon = icon;
  if (iconType === "revenue") {
    renderedIcon = <Banknote className="h-5 w-5" />;
  } else if (iconType === "orders") {
    renderedIcon = <ShoppingBag className="h-5 w-5" />;
  } else if (iconType === "aov") {
    renderedIcon = <CreditCard className="h-5 w-5" />;
  } else if (iconType === "customers") {
    renderedIcon = <UserPlus className="h-5 w-5" />;
  }

  const chartData = sparklineData.map((val, i) => ({ value: val, index: i }));

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/60 bg-card text-card-foreground shadow-sm rounded-2xl transition-all hover:shadow-md hover:border-border dark:hover:bg-muted/10",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
              resolvedBgColor,
              resolvedTextColor
            )}
          >
            {renderedIcon}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-2xl font-bold tracking-tight text-foreground leading-none mb-1">
              {value}
            </div>
            {description && (
              <div className="text-xs text-muted-foreground truncate">
                {description}
              </div>
            )}
          </div>
        </div>

        <div className="h-[52px] w-full -mx-1 -mb-1 opacity-80 dark:opacity-90">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={resolvedSparkColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
