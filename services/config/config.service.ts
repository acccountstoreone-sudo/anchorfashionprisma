import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/utils/encryption.util";

export interface ProviderConfig {
  id: string;
  name: string;
  provider_type: string;
  provider_code: string;
  config: Record<string, any>;
  is_active: boolean;
  environment: "sandbox" | "production";
}

export class ConfigService {
  /**
   * Fetches an active provider configuration by type and code.
   * Uses the admin client to bypass RLS and fetch sensitive configurations.
   */
  static async getProviderConfig(
    providerType: string,
    providerCode: string
  ): Promise<ProviderConfig | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("connectors")
      .select("*")
      .eq("provider_type", providerType)
      .eq("provider_code", providerCode)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.warn(
        `[ConfigService] Provider config not found or inactive for ${providerType}:${providerCode}`
      );
      return null;
    }

    // Attempt to decrypt sensitive fields inside config if needed
    // Assuming the JSONB config has encrypted strings starting with 'enc:'
    const decryptedConfig = this.decryptConfigObject(data.config || {});

    return {
      ...data,
      config: decryptedConfig,
    } as ProviderConfig;
  }

  /**
   * Fetches all active providers for a specific type (e.g., all payment gateways)
   */
  static async getActiveProvidersByType(
    providerType: string
  ): Promise<ProviderConfig[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("connectors")
      .select("*")
      .eq("provider_type", providerType)
      .eq("is_active", true);

    if (error || !data) {
      return [];
    }

    return data.map((provider) => ({
      ...provider,
      config: this.decryptConfigObject(provider.config || {}),
    })) as ProviderConfig[];
  }

  /**
   * Helper function to decrypt encrypted string values in a config object.
   */
  private static decryptConfigObject(
    config: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (
        typeof value === "string" &&
        value.includes(":") &&
        value.split(":").length === 3
      ) {
        // Simple heuristic: if it has 3 parts separated by colon, try decrypting it
        // Note: Realistically, you'd use a prefix like 'enc:' or a specific structure.
        try {
          result[key] = decrypt(value);
        } catch (e) {
          // If decryption fails, just keep the original value (maybe it's not encrypted)
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
