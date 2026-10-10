import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  PackageSearch,
  Warehouse,
  FileText,
  ArrowLeftRight,
  Truck,
  ClipboardCheck,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Inventory & WMS Dashboard | Anchor Fashion",
  description: "Enterprise Inventory and Warehouse Management System",
};

export default async function InventoryDashboardPage() {
  const supabase = await createClient();

  // Fetch low stock alerts (status: ACTIVE)
  const { data: alerts } = await supabase
    .from("system_alerts")
    .select("*")
    .in("alert_type", ["LOW_STOCK", "OUT_OF_STOCK", "NEGATIVE_STOCK"])
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch pending POs
  const { data: pendingPos } = await supabase
    .from("procurement_orders")
    .select(
      "id, po_number, expected_delivery_date, status, supplier_profiles(company_name)"
    )
    .in("status", ["APPROVED", "SHIPPED"])
    .order("expected_delivery_date", { ascending: true })
    .limit(5);

  const modules = [
    {
      name: "Warehouses",
      desc: "Manage locations & bins",
      href: "/admin/inventory/warehouses",
      icon: Warehouse,
      color: "text-blue-500",
    },
    {
      name: "Stock Control",
      desc: "Real-time inventory levels",
      href: "/admin/inventory/stock",
      icon: PackageSearch,
      color: "text-indigo-500",
    },
    {
      name: "Purchases (PO)",
      desc: "Purchase orders & receiving",
      href: "/admin/inventory/purchases",
      icon: FileText,
      color: "text-green-500",
    },
    {
      name: "Suppliers",
      desc: "Manage vendor profiles",
      href: "/admin/inventory/suppliers",
      icon: Truck,
      color: "text-orange-500",
    },
    {
      name: "Stock Transfers",
      desc: "Internal location movements",
      href: "/admin/inventory/transfers",
      icon: ArrowLeftRight,
      color: "text-purple-500",
    },
    {
      name: "Fulfillment",
      desc: "Pick, pack & ship operations",
      href: "/admin/inventory/fulfillment",
      icon: ArrowUpRight,
      color: "text-teal-500",
    },
    {
      name: "Inventory Audits",
      desc: "Cycle counting & reconciliation",
      href: "/admin/inventory/audits",
      icon: ClipboardCheck,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory & WMS</h2>
          <p className="text-muted-foreground">
            Manage your enterprise supply chain operations.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((mod) => (
          <Card key={mod.name} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{mod.name}</CardTitle>
              <mod.icon className={`h-5 w-5 ${mod.color}`} />
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">{mod.desc}</p>
              <Button variant="outline" size="sm" className="w-full">
                <Link href={mod.href}>Manage</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>Items below reorder point</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between border-b pb-2 last:border-0"
                  >
                    <div className="flex items-start space-x-3">
                      <AlertTriangle
                        className={`mt-0.5 h-5 w-5 ${alert.severity === "CRITICAL" ? "text-red-500" : "text-yellow-500"}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        alert.severity === "CRITICAL"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {alert.alert_type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No low stock alerts at this time.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Purchase Orders</CardTitle>
            <CardDescription>Awaiting goods receipt</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPos && pendingPos.length > 0 ? (
              <div className="space-y-4">
                {pendingPos.map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <Link
                        href={`/admin/inventory/purchases/${po.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {po.po_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {(Array.isArray(po.supplier_profiles)
                          ? po.supplier_profiles[0]?.company_name
                          : (po.supplier_profiles as any)?.company_name) ||
                          "Unknown Supplier"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {po.expected_delivery_date
                          ? format(
                              new Date(po.expected_delivery_date),
                              "MMM d, yyyy"
                            )
                          : "TBD"}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {po.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No pending POs found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
