"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  SupportRepository,
  SupportTicketRecord,
  TicketMessageRecord,
} from "@/repositories/support.repository";

export async function getSupportTicketsAction(): Promise<{
  success: boolean;
  data?: SupportTicketRecord[];
  error?: string;
}> {
  try {
    const tickets = await SupportRepository.getTickets();
    return { success: true, data: tickets };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch support tickets" };
  }
}

export async function getTicketMessagesAction(ticketId: string): Promise<{
  success: boolean;
  data?: TicketMessageRecord[];
  error?: string;
}> {
  try {
    if (!ticketId) return { success: false, error: "Ticket ID is required" };
    const messages = await SupportRepository.getTicketMessages(ticketId);
    // Mark customer messages as read
    await SupportRepository.markMessagesRead(ticketId);
    return { success: true, data: messages };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch messages" };
  }
}

export async function sendAgentMessageAction(params: {
  ticketId: string;
  message: string;
  isInternalNote?: boolean;
}): Promise<{
  success: boolean;
  data?: TicketMessageRecord;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const msg = await SupportRepository.sendMessage({
      ticketId: params.ticketId,
      senderId: user?.id || null,
      message: params.message,
      isInternalNote: params.isInternalNote,
    });

    revalidatePath("/admin/support/chat");
    return { success: true, data: msg };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send message" };
  }
}

export async function updateTicketStatusAction(params: {
  ticketId: string;
  status: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await SupportRepository.updateTicketStatus(params.ticketId, params.status);
    revalidatePath("/admin/support/chat");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update ticket status" };
  }
}

export async function addTicketMessageAction(
  ticketId: string,
  data: { message?: string; body?: string; is_internal_note?: boolean; sender_id?: string; sender_type?: any }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const text = data.message || data.body || "";
    const msg = await SupportRepository.sendMessage({
      ticketId,
      senderId: data.sender_id || user?.id || null,
      message: text,
      isInternalNote: !!data.is_internal_note,
    });

    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath("/admin/support/chat");
    return { success: true, data: msg };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add ticket message" };
  }
}

export async function getKnowledgeBaseAction(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("knowledge_base_articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: true, data: [] };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch knowledge base" };
  }
}

