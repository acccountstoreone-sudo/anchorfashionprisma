import { createAdminClient } from "@/lib/supabase/admin-client";
import { CourierApiLogEntry } from "./types";

/**
 * Strips sensitive keys (passwords, tokens, secret keys) from payload objects before logging
 */
export function sanitizeLogData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sensitiveKeys = new Set([
    "password",
    "client_secret",
    "secretkey",
    "secret_key",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "authorization",
    "token",
  ]);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = "••••••••";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Logs a courier API request and response to courier_api_logs
 */
export async function logCourierApiCall(entry: CourierApiLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    const sanitizedPayload = sanitizeLogData(entry.payload);
    const sanitizedResponse = sanitizeLogData(entry.responseData);

    const { error } = await supabase.from("courier_api_logs").insert({
      courier_code: entry.courierCode,
      method: entry.method,
      endpoint: entry.endpoint,
      status_code: entry.statusCode,
      success: entry.success,
      response_time_ms: entry.responseTimeMs,
      request_id: entry.requestId || null,
      error_message: entry.errorMessage || null,
      payload: sanitizedPayload as any,
      response_data: sanitizedResponse as any,
    });

    if (error) {
      // Table may not have been migrated yet; log locally to stdout and fail open
      console.warn(
        `[CourierLogger] Warning: Could not persist API log to DB (${error.message}). Log details:`,
        {
          courier: entry.courierCode,
          endpoint: entry.endpoint,
          statusCode: entry.statusCode,
          success: entry.success,
        }
      );
    }
  } catch (err: any) {
    console.warn(`[CourierLogger] Exception logging API call: ${err.message}`);
  }
}
