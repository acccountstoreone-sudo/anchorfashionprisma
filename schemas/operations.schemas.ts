import { z } from "zod";

export const LogLevelSchema = z.enum(["INFO", "WARN", "ERROR", "FATAL"]);
export const JobStatusSchema = z.enum(["IDLE", "RUNNING", "PAUSED", "FAILED"]);
export const AlertSeveritySchema = z.enum([
  "INFO",
  "WARNING",
  "CRITICAL",
  "FATAL",
]);
export const AlertStatusSchema = z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]);
export const HealthStatusSchema = z.enum(["UP", "DOWN", "DEGRADED"]);

export const AnalyticsEventSchema = z.object({
  event_category: z.string().min(1, "Category is required"),
  event_action: z.string().min(1, "Action is required"),
  user_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  url: z.string().url().optional().or(z.literal("")),
  payload: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
});

export const DashboardSnapshotSchema = z.object({
  dashboard_type: z.string().min(1),
  timeframe: z.string().min(1),
  snapshot_data: z.record(z.any()),
  expires_at: z.string().datetime().optional().nullable(),
});

export const SystemLogSchema = z.object({
  level: LogLevelSchema,
  service_name: z.string().min(1),
  message: z.string().min(1),
  context: z.record(z.any()).default({}),
  user_id: z.string().uuid().optional().nullable(),
  trace_id: z.string().optional().nullable(),
});

export const SystemMetricSchema = z.object({
  metric_name: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  tags: z.record(z.any()).default({}),
});

export const HealthCheckSchema = z.object({
  service_name: z.string().min(1),
  status: HealthStatusSchema,
  response_time_ms: z.number().optional(),
  details: z.record(z.any()).default({}),
});

export const AIPredictionSchema = z.object({
  model_name: z.string().min(1),
  target_entity_type: z.string().min(1),
  target_entity_id: z.string().optional().nullable(),
  prediction_type: z.string().min(1),
  prediction_data: z.record(z.any()),
  confidence_score: z.number().min(0).max(1).optional().nullable(),
  metadata: z.record(z.any()).default({}),
  valid_until: z.string().datetime().optional().nullable(),
});

export const FeatureFlagSchema = z.object({
  flag_key: z.string().min(1),
  description: z.string().optional(),
  is_enabled: z.boolean().default(false),
  rules: z.array(z.record(z.any())).default([]),
});
