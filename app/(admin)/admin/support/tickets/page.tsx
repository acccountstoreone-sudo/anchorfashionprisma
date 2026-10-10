import { Metadata } from "next";
import {
  getTicketsAction,
  getAvailableAgentsAction,
} from "@/app/actions/support/ticket.actions";
import { getCustomersAction } from "@/actions/crm.actions";
import { createClient } from "@/lib/supabase/server";
import { TicketsClient } from "./TicketsClient";

export const metadata: Metadata = {
  title: "Support Tickets | Admin | Anchor Fashion Enterprise",
  description: "Customer service tickets, complaints, inquiries, and resolution logs",
};

export const dynamic = "force-dynamic";

export default async function TicketManagementPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  const [ticketsRes, agentsRes, customersRes] = await Promise.all([
    getTicketsAction(),
    getAvailableAgentsAction(),
    getCustomersAction(),
  ]);

  const tickets = ticketsRes.data || [];
  const agents = agentsRes.data || [];
  const customers = customersRes.data || [];

  return (
    <div className="p-8 pt-6">
      <TicketsClient
        initialTickets={tickets}
        currentUserId={currentUserId}
        customers={customers}
        agents={agents}
      />
    </div>
  );
}
