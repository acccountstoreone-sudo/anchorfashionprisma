import { Metadata } from "next";
import { Package, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { SimplePieChart } from "@/features/analytics/components/Charts";
import { getProductAnalyticsAction } from "@/app/actions/analytics/dashboard.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inventory Analytics | Anchor Fashion Analytics",
  description: "Product performance and inventory tracking",
};

export const dynamic = "force-dynamic";

export default async function InventoryAnalyticsPage() {
  const { data: analytics, error } = await getProductAnalyticsAction();

  if (error || !analytics) {
    return (
      <div className="p-8 text-red-500">
        Failed to load inventory analytics: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Product & Inventory Analytics
          </h1>
          <p className="text-muted-foreground">
            Stock levels, top-performing products, and inventory health.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Inventory Items"
          value={analytics.totalItems.toLocaleString()}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          title="In Stock"
          value={
            analytics.stockLevels
              .find((s: any) => s.name === "In Stock")
              ?.value.toLocaleString() || "0"
          }
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          title="Low Stock"
          value={analytics.lowStockProducts.toLocaleString()}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          title="Out of Stock"
          value={analytics.outOfStockProducts.toLocaleString()}
          icon={<XCircle className="h-4 w-4 text-red-500" />}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <SimplePieChart
          title="Stock Distribution"
          className="col-span-1"
          data={analytics.stockLevels}
        />

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Top Best Sellers</CardTitle>
            <CardDescription>
              Highest revenue generating products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.bestSellers.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantitySold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
                {analytics.bestSellers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Products</CardTitle>
            <CardDescription>Products with the highest traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.mostViewedProducts.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.views?.toLocaleString() || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worst Sellers</CardTitle>
            <CardDescription>
              Products with the lowest sales volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.worstSellers.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantitySold}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
