import { Metadata } from "next";
import { DataCard } from "@/features/admin/components/DataCard";
import { RecentOrders } from "@/features/admin/components/RecentOrders";
import { SalesOverviewChart } from "@/features/admin/components/SalesOverviewChart";
import { RevenueByCategoryChart } from "@/features/admin/components/RevenueByCategoryChart";
import { UserByContinent } from "@/features/admin/components/UserByContinent";
import { TopSellersTable } from "@/features/admin/components/TopSellersTable";
import { RecentCustomers } from "@/features/admin/components/RecentCustomers";
import { formatCurrency } from "@/lib/utils";
import {
  fetchDashboardRevenueAction,
  fetchDashboardKPIsAction,
  fetchTopSellersAction,
  fetchRevenueByCategoryAction,
  fetchRecentCustomersAction,
  fetchUserLocationsAction,
  fetchRecentOrdersAction,
} from "@/app/actions/bi/dashboard.actions";

export const metadata: Metadata = {
  title: "Dashboard | Anchor Fashion",
  description: "Enterprise Dashboard",
};


export default async function AdminDashboardPage() {
  const [
    revenueRes, 
    kpisRes, 
    topSellersRes,
    revenueByCatRes,
    recentCustomersRes,
    userLocationsRes,
    recentOrdersRes
  ] = await Promise.all([
    fetchDashboardRevenueAction(30),
    fetchDashboardKPIsAction(),
    fetchTopSellersAction(),
    fetchRevenueByCategoryAction(),
    fetchRecentCustomersAction(),
    fetchUserLocationsAction(),
    fetchRecentOrdersAction()
  ]);

  const kpisData = kpisRes?.data;
  const kpis = {
    revenue: {
      value: kpisData?.revenue?.value ?? 0,
      trend: kpisData?.revenue?.trend ?? { value: 0, isPositive: true },
    },
    orders: {
      value: kpisData?.orders?.value ?? 0,
      trend: kpisData?.orders?.trend ?? { value: 0, isPositive: true },
    },
    aov: {
      value: kpisData?.aov?.value ?? 0,
      trend: kpisData?.aov?.trend ?? { value: 0, isPositive: true },
    },
    newCustomers: {
      value: kpisData?.newCustomers?.value ?? 0,
      trend: kpisData?.newCustomers?.trend ?? { value: 0, isPositive: true },
    },
  };

  const rawSalesData = revenueRes.data || [];
  const rawTopSellers = topSellersRes.data || [];
  const rawRevenueByCategory = revenueByCatRes.data || [];
  const rawRecentCustomers = recentCustomersRes.data || [];
  const rawUserLocations = userLocationsRes.data || [];
  const rawRecentOrders = recentOrdersRes.data || [];

  // Plain JSON serialization to avoid RSC boundary issues with non-plain objects
  const salesData = JSON.parse(JSON.stringify(rawSalesData));
  const topSellers = JSON.parse(JSON.stringify(rawTopSellers));
  const revenueByCategory = JSON.parse(JSON.stringify(rawRevenueByCategory));
  const recentCustomers = JSON.parse(JSON.stringify(rawRecentCustomers));
  const userLocations = JSON.parse(JSON.stringify(rawUserLocations));
  const recentOrders = JSON.parse(JSON.stringify(rawRecentOrders));

  const aovSparkline = salesData.length > 0 ? salesData.map((d: any) => d.aov || 0) : [0];
  const newCustomersSparkline = salesData.length > 0 ? salesData.map((d: any) => d.newCustomers || 0) : [0];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard
          title="Total Revenue"
          value={formatCurrency(kpis.revenue.value)}
          description="Compared to yesterday"
          iconType="revenue"
          iconBgColor="bg-teal-50 dark:bg-teal-950/60"
          iconTextColor="text-teal-600 dark:text-teal-400"
          sparklineColor="#0D9488"
          sparklineData={salesData.map((d: any) => d.revenue).slice(-10)} // last 10 days
        />
        <DataCard
          title="Total Orders"
          value={kpis.orders.value.toLocaleString()}
          description="Compared to yesterday"
          iconType="orders"
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconTextColor="text-purple-600 dark:text-purple-400"
          sparklineColor="#9333EA"
          sparklineData={salesData.map((d: any) => d.orders).slice(-10)}
        />
        <DataCard
          title="Average Order Value"
          value={formatCurrency(kpis.aov.value)}
          description="Compared to yesterday"
          iconType="aov"
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
          sparklineColor="#E65100"
          sparklineData={aovSparkline}
        />
        <DataCard
          title="New Customers"
          value={kpis.newCustomers.value.toLocaleString()}
          description="Compared to yesterday"
          iconType="customers"
          iconBgColor="bg-pink-50 dark:bg-pink-950/60"
          iconTextColor="text-pink-600 dark:text-pink-400"
          sparklineColor="#DB2777"
          sparklineData={newCustomersSparkline}
        />
      </div>

      {/* Row 2: Recent Orders & Sales Overview */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RecentOrders data={recentOrders} />
        </div>
        <div className="lg:col-span-4">
          <SalesOverviewChart data={salesData} />
        </div>
      </div>

      {/* Row 3: Recent Customers, Revenue By Category, User By Continent */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <RecentCustomers data={recentCustomers} />
        </div>
        <div className="lg:col-span-4">
          <RevenueByCategoryChart data={revenueByCategory} />
        </div>
        <div className="lg:col-span-4">
          <UserByContinent data={userLocations} />
        </div>
      </div>

      {/* Row 4: Top Sellers */}
      <div className="grid gap-6 lg:grid-cols-12 pb-10">
        <div className="lg:col-span-12">
          <TopSellersTable data={topSellers} />
        </div>
      </div>
    </div>
  );
}
