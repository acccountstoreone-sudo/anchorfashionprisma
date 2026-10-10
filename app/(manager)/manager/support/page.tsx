import { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, HelpCircle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTicketsAction } from "@/app/actions/support/ticket.actions";
import { SupportSearch } from "./SupportSearch";
import { ExportTicketsButton } from "./ExportTicketsButton";
import { SupportTicketReplyDialog } from "./SupportTicketReplyDialog";

export const metadata: Metadata = {
  title: "Support Center | Manager Dashboard",
};

export const dynamic = "force-dynamic";

function getCustomerDisplayName(ticket: any): string {
  if (ticket.customer_name && typeof ticket.customer_name === "string") {
    return ticket.customer_name;
  }
  if (typeof ticket.customer === "string") {
    return ticket.customer;
  }
  if (ticket.customer && typeof ticket.customer === "object") {
    return ticket.customer.full_name || ticket.customer.name || ticket.customer.phone || "Customer";
  }
  return "Guest";
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; search?: string }>;
}) {
  const query = (await searchParams).q || (await searchParams).search || "";
  const res = await getTicketsAction();
  const allTickets = (res.data || []) as any[];

  // Filter if query is provided
  const tickets = query
    ? allTickets.filter((t) => {
        const customerName = getCustomerDisplayName(t).toLowerCase();
        const subject = (t.subject || "").toLowerCase();
        const ticketNum = String(t.ticket_number || t.id || "").toLowerCase();
        const q = query.toLowerCase();
        return subject.includes(q) || customerName.includes(q) || ticketNum.includes(q);
      })
    : allTickets;

  const openCount = allTickets.filter(
    (t) => (t.status || "").toUpperCase() === "OPEN"
  ).length;
  const inProgressCount = allTickets.filter(
    (t) => (t.status || "").toUpperCase() === "IN_PROGRESS" || (t.status || "").toUpperCase() === "ASSIGNED"
  ).length;
  const resolvedCount = allTickets.filter(
    (t) => (t.status || "").toUpperCase() === "RESOLVED" || (t.status || "").toUpperCase() === "CLOSED"
  ).length;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="mt-1 text-muted-foreground">
            Manage customer inquiries, support tickets, and communications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportTicketsButton tickets={tickets} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allTickets.length}</div>
            <p className="text-xs text-muted-foreground">All logged tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <MessageCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{openCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">Completed tickets</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <SupportSearch />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No support tickets found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket: any) => {
                const priorityStr = (ticket.priority || "medium").toLowerCase();
                const statusStr = (ticket.status || "OPEN").toUpperCase();
                const customerName = getCustomerDisplayName(ticket);

                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ticket.ticket_number ? `#${ticket.ticket_number}` : ticket.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{ticket.subject}</div>
                      {ticket.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {ticket.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {customerName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          priorityStr === "high" || priorityStr === "urgent" || priorityStr === "critical"
                            ? "destructive"
                            : priorityStr === "medium"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          priorityStr === "medium"
                            ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900"
                            : ""
                        }
                      >
                        {ticket.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusStr === "OPEN"
                            ? "default"
                            : statusStr === "IN_PROGRESS" || statusStr === "ASSIGNED"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          statusStr === "OPEN"
                            ? "bg-orange-500 hover:bg-orange-600"
                            : statusStr === "RESOLVED" || statusStr === "CLOSED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900"
                              : ""
                        }
                      >
                        {statusStr.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <SupportTicketReplyDialog ticket={ticket} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
