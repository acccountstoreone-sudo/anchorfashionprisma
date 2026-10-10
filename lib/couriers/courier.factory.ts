import { CourierProvider } from "./courier.interface";
import { CourierCode, CourierEnvironment } from "./types";
import { PathaoCourierProvider } from "./pathao";
import { SteadfastCourierProvider } from "./steadfast";
import { SandboxCourierProvider } from "./sandbox";
import { decryptCredentialsObject } from "@/utils/encryption.util";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { CourierError } from "./errors";

export class CourierFactory {
  /**
   * Instantiates a CourierProvider with provided configuration and decrypted credentials
   */
  static getProvider(
    code: CourierCode,
    rawCredentials: Record<string, any>,
    options?: {
      environment?: CourierEnvironment;
      storeId?: string;
      webhookSecret?: string;
      baseUrl?: string;
    }
  ): CourierProvider {
    const creds = decryptCredentialsObject(rawCredentials || {});
    const env: CourierEnvironment = options?.environment ?? "sandbox";

    switch (code) {
      case "pathao":
        return new PathaoCourierProvider({
          credentials: {
            clientId: creds.clientId || creds.client_id || "",
            clientSecret: creds.clientSecret || creds.client_secret || "",
            username: creds.username || creds.email || "",
            password: creds.password || "",
            storeId: options?.storeId || creds.storeId || creds.store_id || "",
          },
          environment: env,
          storeId: options?.storeId || creds.storeId || creds.store_id,
          webhookSecret: options?.webhookSecret,
        });

      case "steadfast":
        return new SteadfastCourierProvider({
          credentials: {
            apiKey: creds.apiKey || creds.api_key || "",
            secretKey: creds.secretKey || creds.secret_key || "",
          },
          environment: env,
          baseUrl: options?.baseUrl,
        });

      case "sandbox":
        return new SandboxCourierProvider({
          credentials: creds,
          environment: env,
        });

      default:
        throw new CourierError(
          code,
          `Unsupported or unhandled courier provider code: "${code}"`
        );
    }
  }

  /**
   * Loads a courier provider directly from the database by code or ID
   */
  static async getProviderFromDatabase(
    codeOrId: string
  ): Promise<{ provider: CourierProvider; record: any }> {
    const supabase = createAdminClient();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        codeOrId
      );

    const query = supabase.from("courier_providers").select("*");
    const { data: record, error } = isUuid
      ? await query.eq("id", codeOrId).maybeSingle()
      : await query.eq("code", codeOrId).maybeSingle();

    if (error || !record) {
      throw new CourierError(
        codeOrId,
        `Courier provider not found in database: ${error?.message || codeOrId}`
      );
    }

    const provider = CourierFactory.getProvider(
      record.code as CourierCode,
      record.credentials || {},
      {
        environment: record.is_sandbox ? "sandbox" : "production",
        storeId: record.settings?.storeId || record.credentials?.storeId,
        webhookSecret: record.webhook_secret,
      }
    );

    return { provider, record };
  }
}
