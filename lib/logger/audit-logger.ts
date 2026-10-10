import { createAdminClient } from "../supabase/admin-client";

export type AuditEvent =
  "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT";

export interface AuditLogPayload {
  user_id: string;
  action: AuditEvent;
  entity_type: string;
  entity_id: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Enterprise Audit Logger
 * Asynchronously writes high-value operations to a dedicated `audit_logs` table.
 * Uses the Service Role client to bypass RLS, ensuring audit trails cannot be
 * tampered with by regular users.
 */
export class AuditLogger {
  /**
   * Fire-and-forget audit logging.
   * Does not block the main execution thread.
   */
  static log(payload: AuditLogPayload): void {
    // We execute this without awaiting to prevent blocking the user request.
    // In serverless environments, this might need to be awaited or sent to a queue (e.g. Inngest)
    this.writeToDatabase(payload).catch((err) => {
      // Fallback to console if DB insert fails (or forward to Sentry/Datadog)
      console.error("[AUDIT LOG FAILURE]", err, payload);
    });
  }

  private static async writeToDatabase(payload: AuditLogPayload) {
    const supabaseAdmin = createAdminClient();

    // Assumes an `audit_logs` table exists
    const { error } = await supabaseAdmin.from("audit_logs").insert([
      {
        user_id: payload.user_id,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        old_data: payload.old_data,
        new_data: payload.new_data,
        ip_address: payload.ip_address,
        user_agent: payload.user_agent,
      },
    ]);

    if (error) {
      throw new Error(`Failed to insert audit log: ${error.message}`);
    }
  }
}
