import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Filter,
  ArrowRightLeft,
  AlertCircle,
  Building2,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchInventoryAction } from "@/app/actions/manager/inventory.actions";
import { InventorySearch } from "@/features/inventory/components/inventory-search";
import { ExportInventoryButton } from "./ExportInventoryButton";
import { AdjustStockDialog } from "./AdjustStockDialog";

export const metadata: Metadata = {
  title: "Inventory Management | Manager Dashboard",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { data } = await fetchInventoryAction(20, q);
  
  const inventory = data?.items || [];
  const stats = data?.stats || { totalItems: 0, lowStock: 0, outOfStock: 0 };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="mt-1 text-muted-foreground">
            Track stock levels across all warehouses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/manager/inventory/suppliers">
              <Building2 className="mr-2 h-4 w-4" />
              Suppliers
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/manager/inventory/purchase-orders">
              <FileText className="mr-2 h-4 w-4" />
              Purchase Orders
            </Link>
          </Button>
          <ExportInventoryButton items={inventory} />
          <Button asChild>
            <Link href="/manager/inventory/movements">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Movements
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Items in Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all warehouses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">
              Require attention soon
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Out of Stock
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">
              Currently unavailable
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <InventorySearch />
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-6 text-center text-muted-foreground"
                >
                  No inventory records found.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {item.sku}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.warehouse}</TableCell>
                  <TableCell className="text-right font-medium">
                    {item.available}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.reserved}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "In Stock"
                          ? "default"
                          : item.status === "Low Stock"
                            ? "secondary"
                            : "destructive"
                      }
                      className={
                        item.status === "Low Stock"
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : ""
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AdjustStockDialog
                      inventoryId={item.id}
                      sku={item.sku}
                      productName={item.name}
                      currentAvailable={item.available || 0}
                      currentReserved={item.reserved || 0}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
