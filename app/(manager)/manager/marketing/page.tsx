import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Zap, Mail, BellRing } from "lucide-react";
import Link from "next/link";
import { fetchManagerMarketingStatsAction, fetchDashboardCampaignsAction } from "@/app/actions/manager/marketing.actions";

export const metadata: Metadata = {
  title: "Marketing | Manager Dashboard",
};

export default async function MarketingPage() {
  const [statsRes, campaignsRes] = await Promise.all([
    fetchManagerMarketingStatsAction(),
    fetchDashboardCampaignsAction("running", 5)
  ]);

  const stats = statsRes.data || { activeCoupons: 0, upcomingSales: 0, draftEmails: 0, pushSentToday: 0 };
  const campaigns = campaignsRes.data || [];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="mt-1 text-muted-foreground">
            Manage campaigns, discounts, and customer communications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/manager/marketing/campaigns">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/manager/marketing/coupons" className="block">
          <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Coupons</CardTitle>
              <div className="rounded-lg bg-indigo-100 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
                <Tag className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Manage discount codes and auto-applied discounts.
              </p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Active: {stats.activeCoupons}</span>
                <span className="text-indigo-600 dark:text-indigo-400">Manage &rarr;</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/marketing/promotions" className="block">
          <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Flash Sales</CardTitle>
              <div className="rounded-lg bg-orange-100 dark:bg-orange-950/60 p-2 text-orange-600 dark:text-orange-400">
                <Zap className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Schedule limited-time sales and countdowns.
              </p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Upcoming: {stats.upcomingSales}</span>
                <span className="text-orange-600 dark:text-orange-400">Manage &rarr;</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/marketing/newsletter" className="block">
          <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Email Campaigns
              </CardTitle>
              <div className="rounded-lg bg-blue-100 dark:bg-blue-950/60 p-2 text-blue-600 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Draft and schedule newsletters and promo emails.
              </p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Drafts: {stats.draftEmails}</span>
                <span className="text-blue-600 dark:text-blue-400">Manage &rarr;</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/marketing/campaigns" className="block">
          <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Push Notifications
              </CardTitle>
              <div className="rounded-lg bg-green-100 dark:bg-green-950/60 p-2 text-green-600 dark:text-green-400">
                <BellRing className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Send alerts to customers with the mobile app/PWA.
              </p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Sent today: {stats.pushSentToday}</span>
                <span className="text-green-600 dark:text-green-400">Manage &rarr;</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <h2 className="mt-4 text-xl font-bold">Active Campaigns</h2>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {campaigns.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No active campaigns running right now.
              </div>
            ) : (
              campaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{campaign.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {campaign.type} Campaign
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="default"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      {campaign.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Started: {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/manager/marketing/campaigns">
                        View / Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
