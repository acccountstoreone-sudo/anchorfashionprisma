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

export default async function TransactionsPage() {
  const supabase = await createAdminClient();
  const { data: transactions, error } = await supabase
    .from("payment_transactions")
    .select(
      `
      *,
      payment_providers (name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return <div>Error loading transactions: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="font-mono text-xs">
                  {txn.reference_number}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {txn.order_id}
                </TableCell>
                <TableCell>{txn.payment_providers?.name}</TableCell>
                <TableCell>
                  {txn.amount} {txn.currency}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      txn.status === "completed"
                        ? "default"
                        : txn.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {txn.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(txn.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {(!transactions || transactions.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
