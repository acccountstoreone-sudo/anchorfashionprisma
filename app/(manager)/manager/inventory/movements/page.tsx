import { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { getMovementsAction } from "@/app/actions/manager/inventory.actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Inventory Movements | Manager Dashboard",
};

export default async function InventoryMovementsPage() {
  const { data: movementsData } = await getMovementsAction(1, 100);
  const movements = movementsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="mt-1 text-muted-foreground">
            Audit log of all inventory additions, reductions, and transfers.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Variant ID</TableHead>
                <TableHead>Warehouse ID</TableHead>
                <TableHead className="text-right">Qty Change</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!movements || movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Activity className="h-8 w-8 text-muted-foreground/50" />
                      <p>No stock movements recorded yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(movement.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.movement_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{movement.variant_id}</TableCell>
                    <TableCell className="font-mono text-xs">{movement.warehouse_id}</TableCell>
                    <TableCell className="text-right">
                      <span className={movement.quantity > 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.reason_code || "-"}
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
