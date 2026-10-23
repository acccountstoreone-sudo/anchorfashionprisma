import { prisma } from "@/lib/prisma";
import {
  SupportTicket,
  TicketMessage,
} from "@/types/support.types";

export class SupportRepository {
  async getTickets(): Promise<SupportTicket[]> {
    const data = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
    });
    return data.map(mapPrismaTicket) as SupportTicket[];
  }

  async getTicketById(id: string): Promise<SupportTicket> {
    const data = await prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!data) throw new Error("Ticket not found");
    return mapPrismaTicket(data) as SupportTicket;
  }

  async createTicket(ticket: Partial<SupportTicket>): Promise<SupportTicket> {
    const data = await prisma.supportTicket.create({
      data: {
        id: ticket.id,
        ticketNumber: String(ticket.ticket_number || `TKT-${Date.now()}`),
        customerId: (ticket as any).customer_id,
        subject: ticket.subject || "No subject",
        description: ticket.description || "",
        status: ticket.status || "OPEN",
        priority: ticket.priority || "MEDIUM",
        assignedAgentId: ticket.assigned_agent_id,
        category: ticket.category || "GENERAL",
      },
    });
    return mapPrismaTicket(data) as SupportTicket;
  }

  async updateTicket(
    id: string,
    updates: Partial<SupportTicket>
  ): Promise<SupportTicket> {
    const data = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: updates.status,
        priority: updates.priority,
        assignedAgentId: updates.assigned_agent_id,
      },
    });
    return mapPrismaTicket(data) as SupportTicket;
  }

  async getMessages(ticketId: string): Promise<TicketMessage[]> {
    const data = await prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
    return data.map(mapPrismaMessage) as TicketMessage[];
  }

  async addMessage(message: Partial<TicketMessage>): Promise<TicketMessage> {
    const data = await prisma.ticketMessage.create({
      data: {
        id: message.id,
        ticketId: message.ticket_id!,
        senderId: message.sender_id!,
        senderType: message.sender_type || "CUSTOMER",
        body: (message as any).body || (message as any).message || "",
        isInternal: (message as any).is_internal ?? (message as any).isInternal ?? false,
      },
    });
    return mapPrismaMessage(data) as TicketMessage;
  }
}

function mapPrismaTicket(data: any): any {
  return {
    ...data,
    ticket_number: data.ticketNumber,
    customer_id: data.customerId,
    assigned_agent_id: data.assignedAgentId,
    resolved_at: data.resolvedAt?.toISOString(),
    created_at: data.createdAt.toISOString(),
    updated_at: data.updatedAt.toISOString(),
  };
}

function mapPrismaMessage(data: any): any {
  return {
    ...data,
    ticket_id: data.ticketId,
    sender_id: data.senderId,
    sender_type: data.senderType,
    is_internal: data.isInternal,
    created_at: data.createdAt.toISOString(),
  };
}
