import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Award,
  Heart,
  TrendingUp,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/customer/loyalty/tier-badges";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account Overview | Anchor Fashion",
  description: "View your account activity, orders, and rewards.",
};

export default async function AccountOverviewPage() {
  const session = await auth.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  if (!user) {
    redirect("/auth/login?next=/account");
  }

  // 1. Profile & Role
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      user.id
    );

  let profile = null;
  try {
    profile = await prisma.profile.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: user.id }] : []),
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      include: { role: true },
    });
  } catch (err) {
    console.error("[Account Overview] Profile lookup error:", err);
  }

  const role = profile?.role?.name || (user as any).role || "CUSTOMER";
  const firstName =
    profile?.firstName ||
    user.name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Valued Customer";
  const customerId = profile?.id || (isUuid ? user.id : undefined);

  // 2. Orders & Spending
  let recentOrders: any[] = [];
  let recentOrdersCount = 0;
  let monthlySpending = 0;

  if (customerId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    try {
      const orders = await prisma.order.findMany({
        where: {
          OR: [{ customerId: customerId }, { profileId: customerId }],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      recentOrders = orders.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        grand_total: Number(o.totalAmount),
        status: o.status,
        created_at: o.createdAt.toISOString(),
      }));

      const ordersLast30Days = orders.filter(
        (o) => o.createdAt >= thirtyDaysAgo
      );
      recentOrdersCount = ordersLast30Days.length;
      monthlySpending = ordersLast30Days.reduce(
        (acc, o) => acc + Number(o.totalAmount || 0),
        0
      );
    } catch (err) {
      console.error("[Account Overview] Orders lookup error:", err);
    }
  }

  // 3. Wishlist Count
  let savedItemsCount = 0;
  if (customerId) {
    try {
      const wishlist = await prisma.wishlist.findUnique({
        where: { userId: customerId },
        include: { _count: { select: { items: true } } },
      });
      savedItemsCount = wishlist?._count?.items || 0;
    } catch (err) {
      console.error("[Account Overview] Wishlist lookup error:", err);
    }
  }

  // 4. Loyalty
  let loyaltyPoints = 0;
  let loyaltyTier = "MEMBER";
  if (customerId) {
    try {
      const { LoyaltyService } = await import("@/services/loyalty.service");
      const loyalty = await LoyaltyService.getAccount(customerId);
      if (loyalty) {
        loyaltyPoints = loyalty.points_balance || 0;
        loyaltyTier = loyalty.tier || "MEMBER";
      }
    } catch {
      // fallback
    }
  }

  const isEmployee = [
    "MARKETING",
    "MARKETING_MANAGER",
    "STAFF",
    "MANAGER",
    "ADMIN",
    "SUPERADMIN",
  ].includes(role);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Employee Navigation Banner if employee enters customer view */}
      {isEmployee && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
          <div>
            <p className="font-semibold text-sm">Employee Account Notice</p>
            <p className="text-xs text-indigo-700">
              You are logged in with role <strong>{role}</strong>. For your work dashboard and assigned duties, visit your staff workspace.
            </p>
          </div>
          <Button
            size="sm"
            asChild
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            <Link
              href={
                role === "MARKETING" ? "/admin/marketing" : "/admin"
              }
            >
              Open Staff Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-[#1A1A1A] dark:text-white">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Here is a quick overview of your account, orders, and loyalty status.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
          <Award className="h-4 w-4 text-[#C9A86A]" />
          <span className="text-sm font-medium text-[#1A1A1A] dark:text-slate-100">
            {loyaltyPoints.toLocaleString()} Points
          </span>
          <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
          <TierBadge tier={loyaltyTier} showIcon={false} />
        </div>
      </div>

      {/* Metric Cards with Real Values */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          title="Recent Orders"
          value={recentOrdersCount}
          subtitle="In the last 30 days"
          icon={Package}
        />
        <InsightCard
          title="Monthly Spending"
          value={formatCurrency(monthlySpending)}
          subtitle="In the last 30 days"
          icon={TrendingUp}
        />
        <InsightCard
          title="Wishlist"
          value={savedItemsCount}
          subtitle="Items saved for later"
          icon={Heart}
        />
        <InsightCard
          title="Reward Points"
          value={loyaltyPoints}
          subtitle="Available loyalty points"
          icon={Award}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity Card */}
        <Card className="md:col-span-2 border-gray-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-[#1A1A1A] dark:text-white">
                Recent Activity
              </CardTitle>
              <Link
                href="/account/orders"
                className="text-sm font-semibold uppercase tracking-widest text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white flex items-center"
              >
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingBag className="h-10 w-10 text-gray-300 dark:text-slate-600 mb-3" />
                <p className="font-medium text-[#1A1A1A] dark:text-slate-200">
                  No recent orders yet
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
                  Start exploring our collections and your recent purchases will
                  appear right here.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/shop">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {recentOrders.map((order) => (
                  <ActivityItem
                    key={order.id}
                    title={`Order #${
                      order.order_number || order.id.slice(0, 8)
                    }`}
                    subtitle={new Date(order.created_at).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
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
          <Card className="border-gray-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-[#1A1A1A] dark:text-white">
                Quick Links
              </CardTitle>
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
    <Card className="border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-[#1A1A1A]/40 dark:text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-light tracking-tight text-[#1A1A1A] dark:text-white">
          {value}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ title, subtitle, amount, status }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="font-medium text-[#1A1A1A] dark:text-slate-200 group-hover:text-[#C9A86A] transition-colors">
          {title}
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium text-[#1A1A1A] dark:text-slate-200">
          {amount}
        </p>
        <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-slate-500 mt-1">
          {status}
        </p>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700 group"
    >
      <span className="text-sm font-medium text-gray-600 dark:text-slate-300 group-hover:text-[#1A1A1A] dark:group-hover:text-white">
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-[#1A1A1A] dark:group-hover:text-white" />
    </Link>
  );
}
