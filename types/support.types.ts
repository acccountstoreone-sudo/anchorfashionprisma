export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketStatus =
  | "open"
  | "pending"
  | "in_progress"
  | "waiting_for_customer"
  | "resolved"
  | "closed"
  | "reopened";
export type AgentStatus = "online" | "busy" | "offline";
export type SenderType = "CUSTOMER" | "AGENT" | "SYSTEM" | "AI";

export interface SupportDepartment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportAgent {
  id: string;
  user_id: string;
  department_id?: string;
  current_status: AgentStatus;
  max_concurrent_chats: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  auth_users?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface SLAPolicy {
  id: string;
  name: string;
  description?: string;
  priority: TicketPriority;
  first_response_time_minutes: number;
  resolution_time_minutes: number;
  escalation_rule: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: number;
  profile_id?: string;
  subject: string;
  description?: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  department_id?: string;
  assigned_agent_id?: string;
  order_id?: string;
  sla_breach_at?: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  customer_profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  ticket_messages?: TicketMessage[];
}

export interface TicketAssignment {
  id: string;
  ticket_id: string;
  agent_id: string;
  assigned_by?: string;
  assigned_at: string;
  unassigned_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id?: string;
  sender_type: SenderType;
  message: string;
  is_internal_note: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketAttachment {
  id: string;
  message_id?: string;
  ticket_id?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  created_at: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  category_id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  is_published: boolean;
  author_id?: string;
  view_count: number;
  helpful_count: number;
  unhelpful_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}
