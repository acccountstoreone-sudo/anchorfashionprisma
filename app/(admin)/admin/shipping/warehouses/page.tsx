import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Warehouse, MapPin } from "lucide-react";
import Link from "next/link";
import { getWarehousesAction } from "@/app/actions/manager/warehouse.actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Warehouses | Admin Dashboard",
};

export default async function AdminWarehousesPage() {
  const { data: warehouses } = await getWarehousesAction();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
          <p className="mt-1 text-muted-foreground">
            Manage fulfillment centers, locations, and storage bins.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/shipping">
            <Button variant="outline" size="sm">
              ← Shipping
            </Button>
          </Link>
          <Button size="sm" className="flex items-center gap-1" asChild>
            <Link href="/admin/shipping/warehouses/new">
              <Plus className="h-4 w-4" /> New Warehouse
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!warehouses || warehouses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Warehouse className="h-8 w-8 text-muted-foreground/50" />
                      <p>No warehouses found.</p>
                      <Button variant="link" asChild className="h-auto p-0 text-sm">
                        <Link href="/admin/shipping/warehouses/new">
                          Add your first warehouse
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{w.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{w.type}</TableCell>
                    <TableCell>
                      <Badge variant={w.is_active ? "default" : "secondary"}>
                        {w.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/shipping/warehouses/${w.id}`}>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
