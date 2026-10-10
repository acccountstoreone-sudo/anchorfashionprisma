import { createAdminClient } from "@/lib/supabase/server";
import {
  PaymentProvider,
  PaymentSession,
  PaymentTransaction,
  PaymentWebhook,
  PaymentRefund,
  PaymentAuditLog,
} from "@/types/payment";

export class PaymentRepository {
  /**
   * Providers
   */
  async getActiveProviders(): Promise<PaymentProvider[]> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_providers")
      .select("*")
      .eq("status", "active");

    if (error)
      throw new Error(`Failed to get active providers: ${error.message}`);
    return data as PaymentProvider[];
  }

  async getProviderByCode(code: string): Promise<PaymentProvider | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_providers")
      .select("*")
      .eq("code", code)
      .single();

    if (error && error.code !== "PGRST116")
      throw new Error(`Failed to get provider: ${error.message}`);
    return data as PaymentProvider | null;
  }

  async getFallbackProvider(): Promise<PaymentProvider | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_providers")
      .select("*")
      .eq("is_fallback", true)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116")
      throw new Error(`Failed to get fallback provider: ${error.message}`);
    return data as PaymentProvider | null;
  }

  /**
   * Sessions
   */
  async createSession(
    session: Partial<PaymentSession>
  ): Promise<PaymentSession> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_sessions")
      .insert(session)
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return data as PaymentSession;
  }

  async getSessionById(id: string): Promise<PaymentSession | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116")
      throw new Error(`Failed to get session: ${error.message}`);
    return data as PaymentSession | null;
  }

  async updateSession(
    id: string,
    updates: Partial<PaymentSession>
  ): Promise<PaymentSession> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update session: ${error.message}`);
    return data as PaymentSession;
  }

  /**
   * Transactions
   */
  async createTransaction(
    transaction: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .insert(transaction)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to create transaction: ${error.message}`);
    return data as PaymentTransaction;
  }

  async getTransactionById(id: string): Promise<PaymentTransaction | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116")
      throw new Error(`Failed to get transaction: ${error.message}`);
    return data as PaymentTransaction | null;
  }

  async getTransactionByReference(
    reference: string
  ): Promise<PaymentTransaction | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("reference_number", reference)
      .single();

    if (error && error.code !== "PGRST116")
      throw new Error(`Failed to get transaction by ref: ${error.message}`);
    return data as PaymentTransaction | null;
  }

  async getTransactionBySessionId(
    sessionId: string
  ): Promise<PaymentTransaction | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error && error.code !== "PGRST116")
      throw new Error(`Failed to get transaction by session: ${error.message}`);
    return data as PaymentTransaction | null;
  }

  async updateTransaction(
    id: string,
    updates: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to update transaction: ${error.message}`);
    return data as PaymentTransaction;
  }

  /**
   * Webhooks
   */
  async createWebhookEvent(
    webhook: Partial<PaymentWebhook>
  ): Promise<PaymentWebhook> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_webhooks")
      .insert(webhook)
      .select()
      .single();

    if (error) throw new Error(`Failed to log webhook: ${error.message}`);
    return data as PaymentWebhook;
  }

  async updateWebhookEvent(
    id: string,
    updates: Partial<PaymentWebhook>
  ): Promise<PaymentWebhook> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_webhooks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update webhook: ${error.message}`);
    return data as PaymentWebhook;
  }

  /**
   * Refunds
   */
  async createRefund(refund: Partial<PaymentRefund>): Promise<PaymentRefund> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_refunds")
      .insert(refund)
      .select()
      .single();

    if (error) throw new Error(`Failed to create refund: ${error.message}`);
    return data as PaymentRefund;
  }

  async updateRefund(
    id: string,
    updates: Partial<PaymentRefund>
  ): Promise<PaymentRefund> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("payment_refunds")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update refund: ${error.message}`);
    return data as PaymentRefund;
  }

  /**
   * Audit Logs
   */
  async createAuditLog(log: Partial<PaymentAuditLog>): Promise<void> {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("payment_audit_logs").insert(log);

    if (error) throw new Error(`Failed to create audit log: ${error.message}`);
  }
}

export const paymentRepository = new PaymentRepository();
