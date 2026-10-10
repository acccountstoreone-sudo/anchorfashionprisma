"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendIndicator } from "./TrendIndicator";
import { cn } from "@/lib/utils";

interface LiveKpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number; // percentage change
  invertColors?: boolean; // For TrendIndicator
  description?: string;
  className?: string;
  isLive?: boolean;
}

export function LiveKpiCard({
  title,
  value,
  icon,
  trend,
  invertColors,
  description,
  className,
  isLive = false,
}: LiveKpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
          )}
          <div className="h-4 w-4 text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(trend !== undefined || description) && (
          <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
            {trend !== undefined && (
              <TrendIndicator value={trend} invertColors={invertColors} />
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
