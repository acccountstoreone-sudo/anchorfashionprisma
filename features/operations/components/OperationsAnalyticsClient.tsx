"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  RotateCcw,
  Warehouse,
  Boxes,
  Truck,
  DollarSign,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  getOperationsAnalyticsAction,
  OperationsMetrics,
} from "@/actions/admin/operations-analytics.actions";
import { toast } from "sonner";

export function OperationsAnalyticsClient() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "365d" | "all">("30d");
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (range: "7d" | "30d" | "90d" | "365d" | "all") => {
    setLoading(true);
    const res = await getOperationsAnalyticsAction(range);
    if (res.success && res.data) {
      setMetrics(res.data);
    } else {
      toast.error(res.error || "Failed to load operations analytics");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange]);

  const timeRangeLabels: Record<string, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    "365d": "Past Year",
    all: "All Time",
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Operations Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time supply chain, inventory velocity, and fulfillment intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1 bg-muted/40">
          {(["7d", "30d", "90d", "365d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                timeRange === r
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {timeRangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {loading && !metrics ? (
        <div className="py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#C9A86A] mb-3" />
          <p className="text-sm text-muted-foreground">Aggregating operational database metrics...</p>
        </div>
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Revenue & Volume */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operational Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-[#C9A86A]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ৳{(metrics?.revenue.total || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span>{metrics?.revenue.orderCount || 0} orders</span>
                  <span>•</span>
                  <span>Avg: ৳{Math.round(metrics?.revenue.averageOrderValue || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Units & Low Stock */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock Units in Network
                </CardTitle>
                <Boxes className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {(metrics?.inventory.totalUnits || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span className="text-amber-500 font-medium">
                    {metrics?.inventory.lowStockCount || 0} Low Stock
                  </span>
                  <span>•</span>
                  <span className="text-rose-500 font-medium">
                    {metrics?.inventory.outOfStockCount || 0} Out
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Velocity */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fulfillment Rate
                </CardTitle>
                <Truck className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {metrics?.fulfillment.fulfillmentRate || 100}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics?.fulfillment.completedPickLists || 0} /{" "}
                  {metrics?.fulfillment.totalPickLists || 0} pick lists completed
                </div>
              </CardContent>
            </Card>

            {/* Return Velocity */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Return Rate
                </CardTitle>
                <RotateCcw className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  {metrics?.returns.returnRate || 0}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics?.returns.totalReturns || 0} returns • ৳
                  {(metrics?.returns.totalRefundAmount || 0).toLocaleString()} refunded
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metric Cards: Procurement & Stock Health */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-[#C9A86A]" />
                  Procurement Pipeline
                </CardTitle>
                <CardDescription>
                  Inbound replenishment orders and supplier spend in selected timeframe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs text-muted-foreground">Total POs</span>
                    <div className="text-xl font-bold mt-0.5">
                      {metrics?.procurement.totalPOs || 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs text-muted-foreground">Total Spend</span>
                    <div className="text-xl font-bold text-[#C9A86A] mt-0.5">
                      ৳{Math.round(metrics?.procurement.totalSpend || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs text-muted-foreground">In-Flight POs</span>
                    <div className="text-xl font-bold text-amber-500 mt-0.5">
                      {metrics?.procurement.pendingPOs || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#C9A86A]" />
                  Stock Distribution Health
                </CardTitle>
                <CardDescription>
                  Active variant coverage and replenishment vulnerability metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs text-muted-foreground">Active Variants</span>
                    <div className="text-xl font-bold mt-0.5">
                      {metrics?.inventory.totalVariants || 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs text-muted-foreground">Low Stock Alert</span>
                    <div className="text-xl font-bold text-amber-500 mt-0.5">
                      {metrics?.inventory.lowStockCount || 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs text-muted-foreground">Stockout Risk</span>
                    <div className="text-xl font-bold text-rose-500 mt-0.5">
                      {metrics?.inventory.outOfStockCount || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warehouse Performance Matrix */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-[#C9A86A]" />
                Warehouse Fulfillment & Capacity Matrix
              </CardTitle>
              <CardDescription>
                Live operational workload, inventory allocation, and active order volume across facilities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="font-semibold">Facility Name</TableHead>
                      <TableHead className="font-semibold">Warehouse Code</TableHead>
                      <TableHead className="font-semibold">Units On-Hand</TableHead>
                      <TableHead className="font-semibold">Active Inbound POs</TableHead>
                      <TableHead className="font-semibold">Active Pick Lists</TableHead>
                      <TableHead className="text-right font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(metrics?.warehouseBreakdown || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No warehouse facilities registered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics?.warehouseBreakdown.map((wh) => (
                        <TableRow key={wh.id} className="border-b border-border/50">
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {wh.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{wh.code}</TableCell>
                          <TableCell className="font-semibold">
                            {wh.units.toLocaleString()} units
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={wh.activePOs > 0 ? "border-amber-500/30 text-amber-500" : ""}
                            >
                              {wh.activePOs} active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={wh.activePickLists > 0 ? "border-blue-500/30 text-blue-500" : ""}
                            >
                              {wh.activePickLists} in picking
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs">
                              Operational
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Activity Breakdown Matrix */}
          {metrics?.recentTrends && metrics.recentTrends.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#C9A86A]" />
                  Recent Operations Timeline
                </CardTitle>
                <CardDescription>
                  Daily order throughput, returns received, and revenue intake.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Orders Processed</TableHead>
                        <TableHead className="font-semibold">Returns Received</TableHead>
                        <TableHead className="text-right font-semibold">Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.recentTrends.map((t, idx) => (
                        <TableRow key={idx} className="border-b border-border/50">
                          <TableCell className="font-medium text-sm">{t.date}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-500">{t.orders}</span> orders
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-purple-500">{t.returns}</span> returns
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-[#C9A86A]">
                            ৳{t.revenue.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
