export type LogLevel = "INFO" | "WARN" | "ERROR" | "FATAL";
export type JobStatus = "IDLE" | "RUNNING" | "PAUSED" | "FAILED";
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "FATAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type HealthStatus = "UP" | "DOWN" | "DEGRADED";
export type DashboardType =
  | "executive"
  | "sales"
  | "inventory"
  | "marketing"
  | "crm"
  | "support"
  | "finance"
  | "warehouse"
  | "courier"
  | "ai";

export interface AnalyticsEvent {
  id: string;
  event_category: string;
  event_action: string;
  user_id?: string | null;
  session_id?: string | null;
  url?: string;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DashboardSnapshot {
  id: string;
  dashboard_type: DashboardType | string;
  timeframe: string;
  snapshot_data: Record<string, any>;
  generated_at: string;
  expires_at?: string;
}

export interface SystemLog {
  id: string;
  level: LogLevel;
  service_name: string;
  message: string;
  context: Record<string, any>;
  user_id?: string | null;
  trace_id?: string | null;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  value: number;
  unit?: string;
  tags: Record<string, any>;
  timestamp: string;
}

export interface HealthCheck {
  id: string;
  service_name: string;
  status: HealthStatus;
  response_time_ms?: number;
  details: Record<string, any>;
  last_checked_at: string;
}

export interface AIPrediction {
  id: string;
  model_name: string;
  target_entity_type: string;
  target_entity_id?: string | null;
  prediction_type: string;
  prediction_data: Record<string, any>;
  confidence_score?: number | null;
  metadata: Record<string, any>;
  created_at: string;
  valid_until?: string | null;
}

export interface ScheduledJob {
  id: string;
  job_name: string;
  description?: string;
  cron_expression?: string;
  status: JobStatus;
  last_run_at?: string | null;
  next_run_at?: string | null;
  last_run_status?: string | null;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  description?: string;
  is_enabled: boolean;
  rules: Record<string, any>[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemAlert {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  status: AlertStatus;
  assigned_to?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}
