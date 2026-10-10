import { Metadata } from "next";
import Link from "next/link";
import { Download, Filter, FileText, ArrowRight, BarChart3, Users, Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { AnalyticsFilters } from "@/features/analytics/components/AnalyticsFilters";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reports & Exports | Anchor Fashion Analytics",
  description: "Generate and export custom BI enterprise reports",
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Reports</h1>
          <p className="text-muted-foreground mt-1">
            Access automated executive exports or design multi-dimensional custom reports.
          </p>
        </div>
        <Link href="/admin/reports/builder">
          <Button className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Custom Report Builder
          </Button>
        </Link>
      </div>

      <AnalyticsFilters />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Sales & Revenue Report */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Sales & Revenue Report
            </CardTitle>
            <CardDescription>
              Comprehensive breakdown of sales across channels & dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Includes gross sales, orders, net profit, refunds, and units sold grouped by date, brand, or category.
            </p>
          </CardContent>
          <CardFooter className="pt-2">
            <Link href="/admin/reports/builder" className="w-full">
              <Button variant="outline" size="sm" className="w-full gap-2">
                Open in Custom Builder
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Customer Segment Report */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Customer Demographics & Channels
            </CardTitle>
            <CardDescription>
              Analyze regional distribution and device channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Multi-dimensional analysis by customer regions, device platforms (Mobile/Desktop), and order frequency.
            </p>
          </CardContent>
          <CardFooter className="pt-2">
            <Link href="/admin/reports/builder" className="w-full">
              <Button variant="outline" size="sm" className="w-full gap-2">
                Open in Custom Builder
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Inventory Valuation Report */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Product Performance & Stock
            </CardTitle>
            <CardDescription>
              Units moved, volume, and gross margin by collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Evaluate category margins, brand performance, and volume throughput for seasonal planning.
            </p>
          </CardContent>
          <CardFooter className="pt-2">
            <Link href="/admin/reports/builder" className="w-full">
              <Button variant="outline" size="sm" className="w-full gap-2">
                Open in Custom Builder
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
