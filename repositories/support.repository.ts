import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export interface SupportTicketRecord {
  id: string;
  ticket_number: number;
  profile_id: string | null;
  subject: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    phone?: string | null;
  } | null;
  last_message?: string | null;
  unread_count?: number;
}

export interface TicketMessageRecord {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "CUSTOMER" | "AGENT" | "SYSTEM" | "AI";
  message: string;
  is_internal_note: boolean;
  read_at: string | null;
  created_at: string;
}

export class SupportRepository {
  private static async getClient() {
    try {
      return createAdminClient();
    } catch {
      return await createClient();
    }
  }

  static async getTickets(): Promise<SupportTicketRecord[]> {
    const supabase = await this.getClient();
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error || !tickets) {
      console.error("Error fetching support tickets:", error);
      return [];
    }

    // Collect profile IDs
    const profileIds = Array.from(
      new Set(tickets.map((t) => t.profile_id).filter(Boolean))
    ) as string[];

    let profilesMap: Record<string, { full_name: string; phone?: string | null }> = {};
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .in("id", profileIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Customer";
          acc[p.id] = { full_name: name, phone: p.phone };
          return acc;
        }, {} as Record<string, { full_name: string; phone?: string | null }>);
      }
    }

    // Attach customer and message stats
    const enriched: SupportTicketRecord[] = await Promise.all(
      tickets.map(async (t) => {
        // Fetch last message
        const { data: lastMsg } = await supabase
          .from("ticket_messages")
          .select("message, created_at, sender_type, read_at")
          .eq("ticket_id", t.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fetch unread count from customer
        const { count: unreadCount } = await supabase
          .from("ticket_messages")
          .select("id", { count: "exact", head: true })
          .eq("ticket_id", t.id)
          .eq("sender_type", "CUSTOMER")
          .is("read_at", null);

        const cust = t.profile_id && profilesMap[t.profile_id]
          ? { id: t.profile_id, ...profilesMap[t.profile_id] }
          : null;

        return {
          ...t,
          customer: cust,
          last_message: lastMsg?.message || t.description || "Ticket opened",
          unread_count: unreadCount || 0,
        };
      })
    );

    return enriched;
  }

  static async getTicketMessages(ticketId: string): Promise<TicketMessageRecord[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching ticket messages:", error);
      return [];
    }
    return data || [];
  }

  static async sendMessage(params: {
    ticketId: string;
    senderId?: string | null;
    message: string;
    isInternalNote?: boolean;
  }): Promise<TicketMessageRecord> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: params.ticketId,
        sender_id: params.senderId || null,
        sender_type: "AGENT",
        message: params.message.trim(),
        is_internal_note: !!params.isInternalNote,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    // Touch ticket updated_at
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.ticketId);

    return data;
  }

  static async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
        ...(status === "closed" ? { closed_at: new Date().toISOString() } : {}),
      })
      .eq("id", ticketId);

    if (error) {
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }
  }

  static async markMessagesRead(ticketId: string): Promise<void> {
    const supabase = await this.getClient();
    await supabase
      .from("ticket_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("ticket_id", ticketId)
      .eq("sender_type", "CUSTOMER")
      .is("read_at", null);
  }

  // --- Instance methods for SupportService compatibility ---
  async getTickets(): Promise<any[]> {
    return SupportRepository.getTickets();
  }

  async getTicketById(id: string): Promise<any> {
    const supabase = await SupportRepository.getClient();
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .select("*, ticket_messages(*)")
      .eq("id", id)
      .maybeSingle();

    let finalTicket = ticket;
    if (error || !finalTicket) {
      const { data: simpleTicket } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!simpleTicket) return null;

      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      finalTicket = {
        ...simpleTicket,
        ticket_messages: messages || [],
      };
    }

    if (finalTicket && finalTicket.profile_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .eq("id", finalTicket.profile_id)
        .maybeSingle();

      if (profile) {
        finalTicket.customer = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name:
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Customer",
          email: profile.email,
          phone: profile.phone,
        };
      }
    }

    return finalTicket;
  }

  static async resolveSupportAgentId(
    agentOrUserId?: string | null
  ): Promise<string | null> {
    if (!agentOrUserId || agentOrUserId === "none") return null;
    const supabase = await this.getClient();

    // 1. Check if already a valid support_agents.id
    const { data: existingAgent } = await supabase
      .from("support_agents")
      .select("id")
      .eq("id", agentOrUserId)
      .maybeSingle();

    if (existingAgent) return existingAgent.id;

    // 2. Check if agentOrUserId is user_id in support_agents
    const { data: agentByUser } = await supabase
      .from("support_agents")
      .select("id")
      .eq("user_id", agentOrUserId)
      .maybeSingle();

    if (agentByUser) return agentByUser.id;

    // 3. Auto register agent if user profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", agentOrUserId)
      .maybeSingle();

    if (profile) {
      const { data: newAgent, error } = await supabase
        .from("support_agents")
        .insert({
          user_id: profile.id,
          current_status: "online",
          is_active: true,
        })
        .select("id")
        .maybeSingle();

      if (!error && newAgent) return newAgent.id;
    }

    return null;
  }

  async createTicket(data: any): Promise<any> {
    const supabase = await SupportRepository.getClient();
    const allowed = [
      "profile_id",
      "subject",
      "description",
      "category",
      "priority",
      "status",
      "department_id",
      "assigned_agent_id",
      "order_id",
      "sla_breach_at",
      "first_response_at",
      "resolved_at",
      "closed_at",
    ];
    const payload: Record<string, any> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        payload[key] = data[key];
      }
    }
    if (data.customer_id && !payload.profile_id) {
      payload.profile_id = data.customer_id;
    }

    if (payload.assigned_agent_id) {
      payload.assigned_agent_id = await SupportRepository.resolveSupportAgentId(
        payload.assigned_agent_id
      );
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return ticket;
  }

  async updateTicket(id: string, data: any): Promise<any> {
    const supabase = await SupportRepository.getClient();
    const allowed = [
      "profile_id",
      "subject",
      "description",
      "category",
      "priority",
      "status",
      "department_id",
      "assigned_agent_id",
      "order_id",
      "sla_breach_at",
      "first_response_at",
      "resolved_at",
      "closed_at",
    ];
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    for (const key of allowed) {
      if (data[key] !== undefined) {
        payload[key] = data[key];
      }
    }
    if (data.customer_id && !payload.profile_id) {
      payload.profile_id = data.customer_id;
    }

    if (payload.assigned_agent_id !== undefined) {
      payload.assigned_agent_id = await SupportRepository.resolveSupportAgentId(
        payload.assigned_agent_id
      );
    }

    if (payload.status === "resolved" && !payload.resolved_at) {
      payload.resolved_at = new Date().toISOString();
    }
    if (payload.status === "closed" && !payload.closed_at) {
      payload.closed_at = new Date().toISOString();
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return ticket;
  }

  async deleteTicket(id: string): Promise<boolean> {
    const supabase = await SupportRepository.getClient();
    try {
      await supabase.from("ticket_attachments").delete().eq("ticket_id", id);
      await supabase.from("ticket_messages").delete().eq("ticket_id", id);
    } catch {}

    const { error } = await supabase
      .from("support_tickets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return true;
  }

  async createTicketMessage(data: any): Promise<any> {
    const supabase = await SupportRepository.getClient();
    const messageText = (data.message || data.body || "").trim();
    const isInternal = !!(data.is_internal_note ?? data.is_internal);

    const payload: Record<string, any> = {
      ticket_id: data.ticket_id,
      sender_type: data.sender_type || "AGENT",
      message: messageText,
      is_internal_note: isInternal,
    };
    if (data.sender_id) {
      payload.sender_id = data.sender_id;
    }

    const { data: msg, error } = await supabase
      .from("ticket_messages")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Touch ticket updated_at
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.ticket_id);

    return msg;
  }

  async getKnowledgeBaseArticles(): Promise<any[]> {
    const supabase = await SupportRepository.getClient();
    const { data } = await supabase
      .from("knowledge_base_articles")
      .select("*")
      .order("created_at", { ascending: false });

    return data || [];
  }

  async getAgents(): Promise<any[]> {
    const supabase = await SupportRepository.getClient();
    let { data: agents } = await supabase
      .from("support_agents")
      .select("id, user_id, current_status, is_active")
      .eq("is_active", true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .eq("is_active", true)
      .limit(30);

    const existingUserIds = new Set((agents || []).map((a) => a.user_id));

    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        if (!existingUserIds.has(p.id)) {
          const { data: newSa } = await supabase
            .from("support_agents")
            .insert({
              user_id: p.id,
              current_status: "online",
              is_active: true,
            })
            .select("id, user_id, current_status, is_active")
            .single();

          if (newSa) {
            agents = [...(agents || []), newSa];
            existingUserIds.add(p.id);
          }
        }
      }
    }

    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});

    return (agents || []).map((a) => {
      const p = profileMap[a.user_id];
      const name = p
        ? [p.first_name, p.last_name].filter(Boolean).join(" ")
        : null;
      return {
        id: a.id,
        user_id: a.user_id,
        first_name: p?.first_name || "Agent",
        last_name: p?.last_name || "",
        full_name: name || "Support Agent",
        status: a.current_status || "online",
      };
    });
  }

  async createTicketAttachment(data: any): Promise<any> {
    const supabase = await SupportRepository.getClient();
    const { data: att, error } = await supabase
      .from("ticket_attachments")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return att;
  }
}

export const supportRepository = new SupportRepository();

