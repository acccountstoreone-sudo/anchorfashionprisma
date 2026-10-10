import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchTicketDetailsAction } from "@/app/actions/customer.actions";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag, Calendar, AlertCircle } from "lucide-react";
import { SupportTicketThread } from "@/features/customer/SupportTicketThread";

export const metadata: Metadata = {
  title: "Ticket Details | Anchor Fashion Support",
};

export default async function SupportTicketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const res = await fetchTicketDetailsAction(id);
  if (!res.success || !res.data) {
    notFound();
  }

  const ticket = res.data;
  const statusUpper = (ticket.status || "OPEN").toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
      case "CLOSED":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{status}</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300">{status}</Badge>;
      default:
        return <Badge className="bg-primary text-primary-foreground">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9">
            <Link href="/account/support">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="line-clamp-1 text-2xl font-bold tracking-tight">
                {ticket.subject}
              </h1>
              {getStatusBadge(ticket.status || "open")}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              {ticket.ticket_number && (
                <span className="font-mono font-medium">#{ticket.ticket_number}</span>
              )}
              {ticket.category && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {ticket.category}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(ticket.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <SupportTicketThread
        ticketId={ticket.id}
        initialDescription={ticket.description}
        ticketCreatedAt={ticket.created_at}
        status={ticket.status || "open"}
        messages={ticket.messages || []}
      />
    </div>
  );
}
