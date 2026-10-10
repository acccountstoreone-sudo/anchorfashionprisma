import { createAdminClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0;

export default async function RefundsPage() {
  const supabase = await createAdminClient();
  const { data: refunds, error } = await supabase
    .from("payment_refunds")
    .select(
      `
      *,
      payment_transactions (reference_number, order_id)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return <div>Error loading refunds: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Refunds</h1>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction Ref</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds?.map((refund) => (
              <TableRow key={refund.id}>
                <TableCell className="font-mono text-xs">
                  {refund.payment_transactions?.reference_number}
                </TableCell>
                <TableCell>{refund.amount}</TableCell>
                <TableCell>{refund.reason}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      refund.status === "completed"
                        ? "default"
                        : refund.status === "failed" ||
                            refund.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {refund.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(refund.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {(!refunds || refunds.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No refunds found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
