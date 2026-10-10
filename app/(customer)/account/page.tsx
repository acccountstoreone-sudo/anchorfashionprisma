"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Award, Heart, TrendingUp, CreditCard, ChevronRight, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/customer/loyalty/tier-badges";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface AccountSummary {
  firstName: string;
  recentOrdersCount: number;
  monthlySpending: number;
  savedItemsCount: number;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  recentOrders: any[];
  role: string;
}

export default function AccountOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AccountSummary>({
    firstName: "Valued Customer",
    recentOrdersCount: 0,
    monthlySpending: 0,
    savedItemsCount: 0,
    loyaltyPoints: 0,
    loyaltyTier: "MEMBER",
    recentOrders: [],
    role: "CUSTOMER",
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadAccountData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Profile Name
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, roles(name)")
          .eq("id", user.id)
          .maybeSingle();

        const userRole = (profile?.roles as any)?.name || user.user_metadata?.role || "CUSTOMER";
        const name = profile?.first_name || user.user_metadata?.first_name || user.email?.split("@")[0] || "Valued Customer";

        // 2. Orders in the last 30 days & Total Spending
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentOrdersData } = await supabase
          .from("orders")
          .select("id, order_number, grand_total, status, created_at")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const recentOrders = recentOrdersData || [];

        const ordersLast30Days = recentOrders.filter(
          (o) => new Date(o.created_at).toISOString() >= thirtyDaysAgo
        );
        const recentOrdersCount = ordersLast30Days.length;

        const monthlySpending = ordersLast30Days.reduce(
          (acc, o) => acc + (Number(o.grand_total) || 0),
          0
        );

        // 3. Saved Items (Wishlist)
        const { count: wishlistCount } = await supabase
          .from("wishlist_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        // 4. Loyalty
        const { data: loyalty } = await supabase
          .from("loyalty_accounts")
          .select("points_balance, tier")
          .eq("customer_id", user.id)
          .maybeSingle();

        setSummary({
          firstName: name,
          recentOrdersCount,
          monthlySpending,
          savedItemsCount: wishlistCount || 0,
          loyaltyPoints: loyalty?.points_balance || 0,
          loyaltyTier: loyalty?.tier || "MEMBER",
          recentOrders,
          role: userRole,
        });
      } catch (err) {
        console.error("Failed to load account summary:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAccountData();
  }, [supabase]);

  const isEmployee = ["MARKETING", "MARKETING_MANAGER", "STAFF", "MANAGER", "ADMIN", "SUPERADMIN"].includes(summary.role);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Employee Navigation Banner if employee enters customer view */}
      {isEmployee && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
          <div>
            <p className="font-semibold text-sm">Employee Account Notice</p>
            <p className="text-xs text-indigo-700">
              You are logged in with role <strong>{summary.role}</strong>. For your work dashboard and assigned duties, visit your staff workspace.
            </p>
          </div>
          <Button size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
            <Link href={summary.role === "MARKETING" ? "/admin/marketing" : "/admin/profile"}>
              Open Staff Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-[#1A1A1A]">
            {loading ? "Welcome back!" : `Welcome back, ${summary.firstName}!`}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Here is a quick overview of your account, orders, and loyalty status.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
          <Award className="h-4 w-4 text-[#C9A86A]" />
          <span className="text-sm font-medium text-[#1A1A1A]">{(summary.loyaltyPoints || 0).toLocaleString()} Points</span>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <TierBadge tier={summary.loyaltyTier || "MEMBER"} showIcon={false} />
        </div>
      </div>

      {/* Metric Cards with Real Values */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard 
          title="Recent Orders" 
          value={loading ? "..." : summary.recentOrdersCount} 
          subtitle="In the last 30 days" 
          icon={Package} 
        />
        <InsightCard 
          title="Monthly Spending" 
          value={loading ? "..." : formatCurrency(summary.monthlySpending)} 
          subtitle="In the last 30 days" 
          icon={TrendingUp} 
        />
        <InsightCard 
          title="Wishlist" 
          value={loading ? "..." : summary.savedItemsCount} 
          subtitle="Items saved for later" 
          icon={Heart} 
        />
        <InsightCard 
          title="Reward Points" 
          value={loading ? "..." : (summary.loyaltyPoints || 0)} 
          subtitle="Available loyalty points" 
          icon={Award} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity Card */}
        <Card className="md:col-span-2 border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-[#1A1A1A]">Recent Activity</CardTitle>
              <Link href="/account/orders" className="text-sm font-semibold uppercase tracking-widest text-gray-400 hover:text-[#1A1A1A] flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading recent activity...</div>
            ) : summary.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingBag className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-[#1A1A1A]">No recent orders yet</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Start exploring our collections and your recent purchases will appear right here.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/shop">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {summary.recentOrders.map((order) => (
                  <ActivityItem 
                    key={order.id}
                    title={`Order #${order.order_number || order.id.slice(0, 8)}`} 
                    subtitle={new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} 
                    amount={formatCurrency(order.grand_total)} 
                    status={order.status || "Processing"} 
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links & Information */}
        <div className="space-y-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-[#1A1A1A]">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickLink href="/account/orders" label="Order History" />
              <QuickLink href="/account/wishlist" label="My Wishlist" />
              <QuickLink href="/account/loyalty" label="Loyalty & Tier Status" />
              <QuickLink href="/account/profile" label="Profile Settings" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, subtitle, icon: Icon }: any) {
  return (
    <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#1A1A1A]/40" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-light tracking-tight text-[#1A1A1A]">{value}</div>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ title, subtitle, amount, status }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="font-medium text-[#1A1A1A] group-hover:text-[#C9A86A] transition-colors">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-[#1A1A1A]">{amount}</p>
        <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 mt-1">{status}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
      <span className="text-sm font-medium text-gray-600 group-hover:text-[#1A1A1A]">{label}</span>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#1A1A1A]" />
    </Link>
  );
}
