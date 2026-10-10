import { createClient } from "@/lib/supabase/server-client";
import { PaymentProvider, PaymentProviderCode } from "@/types/payment.types";

export class PaymentProviderRepository {
  /**
   * Get all payment providers
   */
  async getProviders(activeOnly: boolean = false): Promise<PaymentProvider[]> {
    const supabase = await createClient();
    let query = supabase.from("payment_providers").select("*");

    if (activeOnly) {
      query = query.eq("status", "active");
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch payment providers: ${error.message}`);
    }

    return data as PaymentProvider[];
  }

  /**
   * Get provider by Code
   */
  async getProviderByCode(
    code: PaymentProviderCode
  ): Promise<PaymentProvider | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_providers")
      .select("*")
      .eq("code", code)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch provider: ${error.message}`);
    }

    return data as PaymentProvider;
  }

  /**
   * Update provider config
   */
  async updateProvider(
    id: string,
    data: Partial<PaymentProvider>
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("payment_providers")
      .update(data)
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to update provider: ${error.message}`);
    }
  }

  /**
   * Get fallback provider
   */
  async getFallbackProvider(): Promise<PaymentProvider | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_providers")
      .select("*")
      .eq("is_fallback", true)
      .eq("status", "active")
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch fallback provider: ${error.message}`);
    }

    return data as PaymentProvider;
  }
}
