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

export default async function WebhooksPage() {
  const supabase = await createAdminClient();
  const { data: webhooks, error } = await supabase
    .from("payment_webhooks")
    .select(
      `
      *,
      payment_providers (name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return <div>Error loading webhooks: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Webhooks Monitoring
        </h1>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Type</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks?.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell>{webhook.event_type}</TableCell>
                <TableCell>{webhook.payment_providers?.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      webhook.status === "completed"
                        ? "default"
                        : webhook.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {webhook.status}
                  </Badge>
                </TableCell>
                <TableCell>{webhook.retry_count}</TableCell>
                <TableCell>
                  {new Date(webhook.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {(!webhooks || webhooks.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No webhooks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
