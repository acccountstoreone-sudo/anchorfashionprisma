export type LogLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface LogEntry {
  service_id: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  trace_id?: string;
  correlation_id?: string;
}

export interface MetricEntry {
  service_id: string;
  metric_name: string;
  metric_value: number;
  unit?: string;
  tags?: Record<string, any>;
}

export interface IncidentEntry {
  title: string;
  description: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  primary_service_id: string;
}

export const ObservabilityService = {
  async log(entry: LogEntry) {
    console.log("[Observability Log]", entry);
  },

  async recordMetric(entry: MetricEntry) {
    console.log("[Observability Metric]", entry);
  },

  async createIncident(entry: IncidentEntry) {
    console.error("[Observability Incident]", entry);
    return null;
  },

  async recordAITelemetry(telemetry: any) {
    console.log("[Observability AI Telemetry]", telemetry);
  },

  async runHealthChecks() {
    return {
      database: "UNKNOWN",
      api: "UP",
      timestamp: new Date().toISOString(),
    };
  },
};
