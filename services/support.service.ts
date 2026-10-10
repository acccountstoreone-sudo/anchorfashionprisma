import { supportRepository } from "@/repositories/support.repository";
import {
  createSupportTicketSchema,
  updateSupportTicketSchema,
  createTicketMessageSchema,
} from "@/schemas/support.schema";
import { SupportTicket, TicketMessage } from "@/types/support.types";

export class SupportService {
  async getTickets() {
    return await supportRepository.getTickets();
  }

  async getTicketDetails(id: string) {
    const ticket = await supportRepository.getTicketById(id);
    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  async createTicket(data: unknown): Promise<SupportTicket> {
    const validData = createSupportTicketSchema.parse(data);

    // Map customer_id to profile_id if provided
    const profileId = validData.profile_id || validData.customer_id;

    // Evaluate SLAs here (simplified logic)
    let slaBreachAt = new Date();
    if (validData.priority === "critical")
      slaBreachAt.setHours(slaBreachAt.getHours() + 1);
    else if (validData.priority === "high")
      slaBreachAt.setHours(slaBreachAt.getHours() + 8);
    else slaBreachAt.setHours(slaBreachAt.getHours() + 24);

    const payload: Record<string, any> = {
      subject: validData.subject,
      description: validData.description || null,
      category: validData.category,
      priority: validData.priority,
      status: validData.status || "open",
      sla_breach_at: slaBreachAt.toISOString(),
    };

    if (profileId) payload.profile_id = profileId;
    if (validData.assigned_agent_id) payload.assigned_agent_id = validData.assigned_agent_id;
    if (validData.department_id) payload.department_id = validData.department_id;
    if (validData.order_id) payload.order_id = validData.order_id;

    return await supportRepository.createTicket(payload);
  }

  async updateTicket(id: string, data: unknown): Promise<SupportTicket> {
    const validData = updateSupportTicketSchema.parse(data);
    const payload: Record<string, any> = {};

    if (validData.status !== undefined) payload.status = validData.status;
    if (validData.priority !== undefined) payload.priority = validData.priority;
    if (validData.department_id !== undefined) payload.department_id = validData.department_id;
    if (validData.assigned_agent_id !== undefined) payload.assigned_agent_id = validData.assigned_agent_id;
    if (validData.subject !== undefined) payload.subject = validData.subject;
    if (validData.description !== undefined) payload.description = validData.description;
    if (validData.category !== undefined) payload.category = validData.category;

    const profileId = validData.profile_id || validData.customer_id;
    if (profileId !== undefined) payload.profile_id = profileId;

    return await supportRepository.updateTicket(id, payload);
  }

  async addMessageToTicket(
    ticketId: string,
    data: unknown
  ): Promise<TicketMessage> {
    const validData = createTicketMessageSchema.parse({
      ...(data as any),
      ticket_id: ticketId,
    });

    const messageText = (validData.message || validData.body || "").trim();
    const isInternal = !!(validData.is_internal_note ?? validData.is_internal);

    // Automatically update ticket status when agent replies
    if (validData.sender_type === "AGENT" && !isInternal) {
      await supportRepository.updateTicket(ticketId, {
        status: "waiting_for_customer",
      });
    }

    return await supportRepository.createTicketMessage({
      ticket_id: ticketId,
      sender_id: validData.sender_id || null,
      sender_type: validData.sender_type || "AGENT",
      message: messageText,
      is_internal_note: isInternal,
    });
  }

  async getKnowledgeBase() {
    return await supportRepository.getKnowledgeBaseArticles();
  }

  async getAvailableAgents() {
    return await supportRepository.getAgents();
  }

  async assignTicket(ticketId: string, agentId: string) {
    return await supportRepository.updateTicket(ticketId, {
      assigned_agent_id: agentId,
      status: "in_progress",
    });
  }

  async deleteTicket(id: string) {
    return await supportRepository.deleteTicket(id);
  }
}

export const supportService = new SupportService();
