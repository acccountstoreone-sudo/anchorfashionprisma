export interface CampaignAudience {
  id: string;
  name: string;
  description: string | null;
  segment_criteria: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type CampaignType = "email" | "sms" | "push" | "drip";
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "sending"
  | "sent"
  | "completed"
  | "paused"
  | "failed";

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  audience_id: string | null;
  subject: string | null;
  content: string | null;
  schedule_time: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignLog {
  id: string;
  campaign_id: string;
  recipient_id: string;
  status: string;
  opened_at: Date | null;
  clicked_at: Date | null;
  error_message: string | null;
  created_at: Date;
}
