"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  ShoppingBag,
  PackageCheck,
  AlertTriangle,
} from "lucide-react";

interface StatCardsProps {
  kpis?: {
    revenue: { value: number; trend: { value: number; isPositive: boolean } };
    orders: { value: number; trend: { value: number; isPositive: boolean } };
    processing: {
      value: number;
      trend: { value: number; isPositive: boolean };
    };
    alerts: { value: number; supportTickets?: number };
  };
}

export function StatCards({ kpis }: StatCardsProps) {
  const data = kpis || {
    revenue: { value: 0, trend: { value: 0, isPositive: true } },
    orders: { value: 0, trend: { value: 0, isPositive: true } },
    processing: { value: 0, trend: { value: 0, isPositive: true } },
    alerts: { value: 0 },
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.revenue.value)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.revenue.trend.isPositive ? "+" : "-"}
            {data.revenue.trend.value}% from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.orders.value}</div>
          <p className="text-xs text-muted-foreground">
            {data.orders.trend.isPositive ? "+" : "-"}
            {data.orders.trend.value}% from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing</CardTitle>
          <PackageCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.processing.value}</div>
          <p className="text-xs text-muted-foreground">
            {data.processing.trend.isPositive ? "+" : "-"}
            {data.processing.trend.value}% from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Alerts
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {data.alerts.value}
          </div>
          <p className="text-xs text-destructive/80">
            {data.alerts.supportTickets
              ? `${data.alerts.supportTickets} open support ticket${data.alerts.supportTickets !== 1 ? "s" : ""}`
              : "Requires immediate attention"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
