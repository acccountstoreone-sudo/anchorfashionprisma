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
import { Plus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { getAuditsAction } from "@/app/actions/manager/inventory.actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Inventory Audits | Manager Dashboard",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "PLANNED":
      return <Badge variant="secondary">Planned</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
    case "COMPLETED":
      return <Badge variant="default" className="bg-green-500">Completed</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default async function InventoryAuditsPage() {
  const { data: audits } = await getAuditsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Audits</h1>
          <p className="mt-1 text-muted-foreground">
            Schedule counts and reconcile physical stock with system records.
          </p>
        </div>
        <Button asChild>
          <Link href="/manager/inventory/audits/new">
            <Plus className="mr-2 h-4 w-4" /> Schedule Audit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!audits || audits.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                      <p>No audits scheduled.</p>
                      <Button variant="link" asChild className="h-auto p-0 text-sm">
                        <Link href="/manager/inventory/audits/new">
                          Schedule your first audit
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-mono text-sm">{audit.id.slice(0, 8)}</TableCell>
                    <TableCell>{audit.warehouse?.name || "Unknown"}</TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell>
                      {audit.scheduled_date ? format(new Date(audit.scheduled_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/manager/inventory/audits/${audit.id}`}>
                        <Button variant="outline" size="sm">
                          {audit.status === "COMPLETED" ? "View Results" : "Perform Count"}
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
