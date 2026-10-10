import { Metadata } from "next";
import { StatCards } from "@/components/manager/dashboard/StatCards";
import { RecentOrdersTable } from "@/components/manager/dashboard/RecentOrdersTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "@/components/manager/dashboard/RevenueChart";
import { InventoryAlerts } from "@/components/manager/dashboard/InventoryAlerts";
import { TasksWidget } from "@/components/manager/dashboard/TasksWidget";
import {
  fetchDashboardKPIsAction,
  fetchDashboardRevenueAction,
  fetchOperationalMetricsAction,
  fetchRecentOrdersAction,
} from "@/app/actions/bi/dashboard.actions";

export const metadata: Metadata = {
  title: "Manager Dashboard Overview | Anchor Fashion",
  description: "Overview of today's business operations.",
};

export default async function ManagerDashboardPage() {
  const [kpisRes, revenueRes, recentOrdersRes, opsRes] = await Promise.all([
    fetchDashboardKPIsAction(),
    fetchDashboardRevenueAction(7),
    fetchRecentOrdersAction(),
    fetchOperationalMetricsAction(),
  ]);

  const rawKpis = kpisRes.data || {
    revenue: { value: 0, trend: { value: 0, isPositive: true } },
    orders: { value: 0, trend: { value: 0, isPositive: true } },
  };

  const ops = opsRes.data || {
    pendingOrders: 0,
    supportTickets: 0,
    lowStock: 0,
    outOfStock: 0,
  };

  const kpis = {
    revenue: rawKpis.revenue,
    orders: rawKpis.orders,
    processing: {
      value: ops.pendingOrders,
      trend: { value: 0, isPositive: true },
    },
    alerts: {
      value: ops.lowStock + ops.outOfStock,
      supportTickets: ops.supportTickets,
    },
  };

  // Map revenue to expected format for Recharts
  const revenueData = (revenueRes.data || []).map((d: any) => ({
    name: d.name,
    total: d.revenue,
  }));

  // fetchRecentOrdersAction already joins customer profile — use it directly
  const orders = (recentOrdersRes.data || []).map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer_name || "Guest",
    customerAvatar: o.customer_avatar,
    status: o.status,
    date: new Date(o.created_at).toLocaleDateString(),
    amount: o.grand_total,
  }));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back. Here is what is happening with your store today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/manager/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <StatCards kpis={kpis} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charts & Analytics */}
        <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
          <RevenueChart data={revenueData} />
          <RecentOrdersTable orders={orders} />
        </div>

        {/* Alerts & Tasks */}
        <div className="col-span-1 flex flex-col gap-6">
          <InventoryAlerts />
          <TasksWidget />
        </div>
      </div>
    </div>
  );
}
