import { SupportRepository } from "@/lib/repositories/support.repository";
import { SupportTicket, TicketMessage } from "@/types/support.types";

export class SupportService {
  private repository: SupportRepository;

  constructor() {
    this.repository = new SupportRepository();
  }

  async getTickets(): Promise<SupportTicket[]> {
    return this.repository.getTickets();
  }

  async getTicketById(id: string): Promise<SupportTicket> {
    return this.repository.getTicketById(id);
  }

  async createTicket(
    profileId: string,
    subject: string,
    description: string,
    priority: "low" | "medium" | "high" | "critical" = "low",
    category: string = "general"
  ): Promise<SupportTicket> {
    return this.repository.createTicket({
      profile_id: profileId,
      subject,
      description,
      priority,
      category,
      status: "open",
    });
  }

  async updateTicketStatus(
    id: string,
    status:
      | "open"
      | "pending"
      | "in_progress"
      | "waiting_for_customer"
      | "resolved"
      | "closed"
      | "reopened"
  ): Promise<SupportTicket> {
    const updates: Partial<SupportTicket> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }
    if (status === "closed") {
      updates.closed_at = new Date().toISOString();
    }
    return this.repository.updateTicket(id, updates);
  }

  async getMessages(ticketId: string): Promise<TicketMessage[]> {
    return this.repository.getMessages(ticketId);
  }

  async addReply(
    ticketId: string,
    senderId: string,
    senderType: "CUSTOMER" | "AGENT" | "SYSTEM" | "AI",
    message: string,
    isInternal: boolean = false
  ): Promise<TicketMessage> {
    const reply = await this.repository.addMessage({
      ticket_id: ticketId,
      sender_id: senderId,
      sender_type: senderType,
      message,
      is_internal_note: isInternal,
    });

    // Update ticket status to open if customer replied to a waiting ticket
    if (senderType === "CUSTOMER") {
      await this.updateTicketStatus(ticketId, "open");
    }

    return reply;
  }
}
