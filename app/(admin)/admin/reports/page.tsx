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
  Download,
  FileText,
  Filter,
  Calendar,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Generate, download, and schedule business reports.
          </p>
        </div>
        <Link href="/admin/reports/builder">
          <Button className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Custom Report Builder
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sales Reports */}
        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle>Sales & Revenue</CardTitle>
            </div>
            <CardDescription>
              Daily, weekly, and monthly revenue breakdowns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Daily Sales Report</span>
              </div>
              <Button variant="ghost" size="icon" title="Download CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">
                  Monthly Revenue Report
                </span>
              </div>
              <Button variant="ghost" size="icon" title="Download CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">
                  Tax & Accounting (YTD)
                </span>
              </div>
              <Button variant="ghost" size="icon" title="Download CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Reports */}
        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-green-100 p-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle>Inventory & Stock</CardTitle>
            </div>
            <CardDescription>
              Stock levels, valuation, and reorder alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Low Stock Alerts</span>
              </div>
              <Button variant="ghost" size="icon" title="Download CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Inventory Valuation</span>
              </div>
              <Button variant="ghost" size="icon" title="Download CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Dead Stock Analysis</span>
              </div>
              <Button variant="ghost" size="icon" title="Download CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom Reports Schedule */}
        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-purple-100 p-2">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle>Scheduled Exports</CardTitle>
            </div>
            <CardDescription>
              Automated reports sent to your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Weekly Fulfillment KPI
                </span>
                <span className="text-xs text-muted-foreground">
                  Every Monday at 9:00 AM
                </span>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Monthly Sales Summary
                </span>
                <span className="text-xs text-muted-foreground">
                  1st of every month
                </span>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <Button variant="outline" className="mt-2 w-full">
              Manage Schedules
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
