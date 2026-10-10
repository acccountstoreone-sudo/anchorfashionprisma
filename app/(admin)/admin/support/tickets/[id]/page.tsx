import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTicketDetailsAction,
  getAvailableAgentsAction,
} from "@/app/actions/support/ticket.actions";
import { createClient } from "@/lib/supabase/server";
import { TicketDetailClient } from "./TicketDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Support Ticket #${id.substring(0, 8)} | Anchor Fashion Admin`,
  };
}

export const dynamic = "force-dynamic";

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  const [{ data: ticket, error }, agentsRes] = await Promise.all([
    getTicketDetailsAction(id),
    getAvailableAgentsAction(),
  ]);

  if (error || !ticket) {
    notFound();
  }

  const agents = agentsRes?.data || [];

  return (
    <TicketDetailClient
      initialTicket={ticket}
      currentUserId={currentUserId}
      agents={agents}
    />
  );
}
