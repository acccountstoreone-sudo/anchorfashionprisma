import { Metadata } from "next";
import { getStoreInfo, getStoreConfig } from "@/lib/actions/settings.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Store, Globe, Bell, Shield, ExternalLink, Package, ShoppingCart, KeyRound } from "lucide-react";
import { ChangePassword } from "@/components/customer/ChangePassword";

export const metadata: Metadata = {
  title: "Settings | Manager Dashboard",
  description: "View store configuration and operational preferences.",
};

export const dynamic = "force-dynamic";

export default async function ManagerSettingsPage() {
  const [storeInfo, storeConfig] = await Promise.all([
    getStoreInfo(),
    getStoreConfig(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manager Settings</h1>
        <p className="mt-1 text-muted-foreground">
          View store preferences, operational parameters, and localization settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Store Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Store Information</CardTitle>
                  <CardDescription>Primary store details and contacts</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Live</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
              <span className="text-muted-foreground">Store Name:</span>
              <span className="font-medium text-foreground">{storeInfo.store_name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
              <span className="text-muted-foreground">Support Email:</span>
              <span className="font-medium text-foreground">{storeInfo.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
              <span className="text-muted-foreground">Contact Phone:</span>
              <span className="font-medium text-foreground">{storeInfo.phone}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Physical Address:</span>
              <span className="font-medium text-foreground">{storeInfo.address}</span>
            </div>
          </CardContent>
        </Card>

        {/* Store Localization Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Localization & Currency</CardTitle>
                <CardDescription>System-wide currency and units</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
              <span className="text-muted-foreground">Active Currency:</span>
              <span className="font-medium text-foreground">{storeConfig.currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
              <span className="text-muted-foreground">Store Timezone:</span>
              <span className="font-medium text-foreground">{storeConfig.timezone}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
              <span className="text-muted-foreground">Weight Unit:</span>
              <span className="font-medium text-foreground">{storeConfig.weight_unit}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Free Shipping Threshold:</span>
              <span className="font-medium text-foreground">৳{storeInfo.free_shipping_threshold}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Modules Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operational Management Modules</CardTitle>
          <CardDescription>
            Quick navigation to configure specific inventory and sales workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
              <Link href="/manager/products">
                <Package className="h-4 w-4 mr-3 text-indigo-500" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Catalog & Products</div>
                  <div className="text-xs text-muted-foreground">Manage merchandise</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
              <Link href="/manager/orders">
                <ShoppingCart className="h-4 w-4 mr-3 text-emerald-500" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Orders & Dispatch</div>
                  <div className="text-xs text-muted-foreground">Order processing</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="justify-start h-auto py-3 px-4">
              <Link href="#security">
                <Shield className="h-4 w-4 mr-3 text-amber-500" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Security & Password</div>
                  <div className="text-xs text-muted-foreground">Account security</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Security & Password Change */}
      <div id="security" className="space-y-4 pt-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Security & Password Management
          </h2>
          <p className="text-sm text-muted-foreground">
            View your current password and update login credentials directly from your manager dashboard.
          </p>
        </div>
        <ChangePassword />
      </div>
    </div>
  );
}
