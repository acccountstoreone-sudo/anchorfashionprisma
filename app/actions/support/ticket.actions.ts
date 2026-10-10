"use server";

import { revalidatePath } from "next/cache";
import { supportService } from "@/services/support.service";
import { supportRepository } from "@/repositories/support.repository";

// Support Dashboard & List Actions
export async function getTicketsAction() {
  try {
    const tickets = await supportService.getTickets();
    return { success: true, data: tickets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTicketDetailsAction(id: string) {
  try {
    const ticket = await supportService.getTicketDetails(id);
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAvailableAgentsAction() {
  try {
    const agents = await supportService.getAvailableAgents();
    return { success: true, data: agents };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// CRM Ticket Actions
export async function createTicketAction(data: any) {
  try {
    const ticket = await supportService.createTicket(data);
    revalidatePath("/admin/support/tickets");
    revalidatePath("/portal/support");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTicketAction(id: string, data: any) {
  try {
    const ticket = await supportService.updateTicket(id, data);
    revalidatePath(`/admin/support/tickets/${id}`);
    revalidatePath("/admin/support/tickets");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function replyTicketAction(
  ticketId: string,
  body: string,
  senderId?: string,
  senderType: "CUSTOMER" | "AGENT" = "AGENT"
) {
  try {
    const validSenderId =
      typeof senderId === "string" && UUID_REGEX.test(senderId.trim())
        ? senderId.trim()
        : undefined;

    const message = await supportService.addMessageToTicket(ticketId, {
      body,
      message: body,
      sender_id: validSenderId,
      sender_type: senderType,
      is_internal_note: false,
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    return { success: true, data: message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addInternalNoteAction(
  ticketId: string,
  body: string,
  agentId?: string
) {
  try {
    const validAgentId =
      typeof agentId === "string" && UUID_REGEX.test(agentId.trim())
        ? agentId.trim()
        : undefined;

    const message = await supportService.addMessageToTicket(ticketId, {
      body,
      message: body,
      sender_id: validAgentId,
      sender_type: "AGENT",
      is_internal_note: true,
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    return { success: true, data: message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignTicketAction(ticketId: string, agentId: string) {
  try {
    const ticket = await supportService.assignTicket(ticketId, agentId);
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath("/admin/support/tickets");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeTicketAction(ticketId: string) {
  try {
    const ticket = await supportService.updateTicket(ticketId, {
      status: "closed",
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath("/admin/support/tickets");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reopenTicketAction(ticketId: string) {
  try {
    const ticket = await supportService.updateTicket(ticketId, {
      status: "open",
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath("/admin/support/tickets");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changeTicketStatusAction(
  ticketId: string,
  status: string
) {
  try {
    const ticket = await supportService.updateTicket(ticketId, {
      status: status as any,
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath("/admin/support/tickets");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changeTicketPriorityAction(
  ticketId: string,
  priority: string
) {
  try {
    const ticket = await supportService.updateTicket(ticketId, {
      priority: priority as any,
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath("/admin/support/tickets");
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addTicketAttachmentAction(
  ticketId: string,
  fileUrl: string,
  fileType: string,
  fileName: string
) {
  try {
    const attachment = await supportRepository.createTicketAttachment({
      ticket_id: ticketId,
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
    });
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    return { success: true, data: attachment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTicketAction(ticketId: string) {
  try {
    await supportService.deleteTicket(ticketId);
    revalidatePath("/admin/support/tickets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
