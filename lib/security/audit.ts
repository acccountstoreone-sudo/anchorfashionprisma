import { createAdminClient } from "../supabase/admin";

export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_CHANGED"
  | "ROLE_CHANGED"
  | "PERMISSION_DENIED";

export interface AuditLogEntry {
  event_type: SecurityEventType;
  user_id?: string;
  actor_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Logs a security event to the audit_logs table securely using the Admin client.
 * This should only be called from server environments.
 */
export async function logSecurityEvent(entry: AuditLogEntry) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_logs").insert([
      {
        event_type: entry.event_type,
        user_id: entry.user_id,
        actor_id: entry.actor_id || entry.user_id,
        metadata: entry.metadata || {},
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      },
    ]);

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (error) {
    console.error("Audit logging error:", error);
  }
}
