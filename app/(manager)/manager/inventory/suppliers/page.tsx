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
import { Plus, Building2 } from "lucide-react";
import { getSuppliersAction } from "@/app/actions/manager/procurement.actions";
import Link from "next/link";
import { Supplier } from "@/types/inventory.types";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Suppliers | Manager Dashboard",
};

export default async function SuppliersPage() {
  const { data: suppliers } = await getSuppliersAction();
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your inventory suppliers and vendors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/manager/inventory/suppliers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead className="text-right">Lead Time (Days)</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead className="text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!suppliers || suppliers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                    <p>No suppliers found.</p>
                    <Button variant="link" asChild className="h-auto p-0 text-sm">
                      <Link href="/manager/inventory/suppliers/new">
                        Add your first supplier
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier: Supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium text-primary">
                    <Link href={`/manager/inventory/suppliers/${supplier.id}`} className="hover:underline">
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>{supplier.contact_email || "-"}</TableCell>
                  <TableCell>{supplier.contact_phone || "-"}</TableCell>
                  <TableCell className="text-right">{supplier.lead_time_days}</TableCell>
                  <TableCell className="text-right font-medium">
                    {supplier.rating ? `${supplier.rating} / 5` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(supplier.created_at), { addSuffix: true })}
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
