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
import { Plus, FileText } from "lucide-react";
import { getPurchaseOrdersAction } from "@/app/actions/manager/procurement.actions";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Purchase Orders | Manager Dashboard",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>;
    case "SENT":
      return <Badge variant="default" className="bg-blue-500">Sent</Badge>;
    case "PARTIAL_RECEIPT":
      return <Badge variant="outline" className="text-orange-500 border-orange-500">Partial Receipt</Badge>;
    case "FULFILLED":
      return <Badge variant="default" className="bg-green-500">Fulfilled</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default async function PurchaseOrdersPage() {
  const { data: purchaseOrders } = await getPurchaseOrdersAction();
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your incoming stock and supplier orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/manager/inventory/purchase-orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New PO
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Expected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!purchaseOrders || purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No purchase orders found.</p>
                    <Button variant="link" asChild className="h-auto p-0 text-sm">
                      <Link href="/manager/inventory/purchase-orders/new">
                        Create your first purchase order
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po: any) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium text-primary">
                    <Link href={`/manager/inventory/purchase-orders/${po.id}`} className="hover:underline">
                      {po.po_number}
                    </Link>
                  </TableCell>
                  <TableCell>{po.supplier?.name || "Unknown"}</TableCell>
                  <TableCell>{po.warehouse?.name || "Unknown"}</TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(po.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {po.expected_delivery_date 
                      ? format(new Date(po.expected_delivery_date), "MMM d, yyyy")
                      : "-"}
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
