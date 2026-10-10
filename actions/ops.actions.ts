"use server";

import { createClient } from "@/lib/supabase/server";
import {
  HealthCheckSchema,
  SystemMetricSchema,
  SystemLogSchema,
} from "@/schemas/operations.schemas";
import { HealthCheck, SystemMetric, SystemLog } from "@/types/operations.types";

export async function logSystemEvent(
  data: unknown
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsedData = SystemLogSchema.parse(data);
    const supabase = await createClient();

    const { error } = await supabase.from("system_logs").insert({
      level: parsedData.level,
      service_name: parsedData.service_name,
      message: parsedData.message,
      context: parsedData.context,
      user_id: parsedData.user_id || null,
      trace_id: parsedData.trace_id || null,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: any) {
    console.error("Error logging system event:", error);
    return { error: error.message || "Failed to log event" };
  }
}

export async function recordMetric(
  data: unknown
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsedData = SystemMetricSchema.parse(data);
    const supabase = await createClient();

    const { error } = await supabase.from("system_metrics").insert({
      metric_name: parsedData.metric_name,
      value: parsedData.value,
      unit: parsedData.unit || null,
      tags: parsedData.tags,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: any) {
    console.error("Error recording metric:", error);
    return { error: error.message || "Failed to record metric" };
  }
}

export async function recordHealthCheck(
  data: unknown
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsedData = HealthCheckSchema.parse(data);
    const supabase = await createClient();

    const { error } = await supabase.from("health_checks").insert({
      service_name: parsedData.service_name,
      status: parsedData.status,
      response_time_ms: parsedData.response_time_ms || null,
      details: parsedData.details,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: any) {
    console.error("Error recording health check:", error);
    return { error: error.message || "Failed to record health check" };
  }
}

export async function getSystemAlerts(
  limit: number = 50
): Promise<{ data?: any[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("system_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return { data };
  } catch (error: any) {
    console.error("Error fetching system alerts:", error);
    return { error: error.message || "Failed to fetch alerts" };
  }
}
