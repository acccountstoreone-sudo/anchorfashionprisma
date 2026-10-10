export type LeadStatus =
  "new" | "contacted" | "qualified" | "lost" | "converted";
export type CommunicationType =
  "EMAIL" | "SMS" | "IN_APP" | "PUSH" | "CALL" | "MEETING";
export type CommunicationDirection = "INBOUND" | "OUTBOUND";
export type CustomerLifecycleStage =
  | "PROSPECT"
  | "FIRST_TIME_BUYER"
  | "REPEAT_CUSTOMER"
  | "LOYAL"
  | "AT_RISK"
  | "CHURNED";

export interface CRMCustomer {
  id: string;
  profile_id: string;
  is_vip: boolean;
  is_blocked: boolean;
  block_reason?: string;
  customer_lifecycle_stage: CustomerLifecycleStage;
  health_score: number;
  account_manager_id?: string;
  total_support_tickets: number;
  custom_fields: Record<string, any>;
  last_interaction_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMLead {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company_name?: string;
  status: LeadStatus;
  source?: string;
  assigned_agent_id?: string;
  score: number;
  custom_fields: Record<string, any>;
  converted_to_profile_id?: string;
  next_follow_up_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CRMNote {
  id: string;
  profile_id?: string;
  lead_id?: string;
  author_id?: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  profile_id?: string;
  lead_id?: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  content?: string;
  status: string;
  sender_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}
