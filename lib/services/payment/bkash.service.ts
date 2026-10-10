import { createAdminClient } from "@/lib/supabase/admin-client";

export interface BKashConfig {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  base_url: string;
  is_sandbox: boolean;
}

export interface BKashGrantTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface BKashCreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  bkashURL: string;
  customerMsisdn?: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

export interface BKashExecutePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  amount: string;
  transactionStatus: string;
  paymentExecuteTime: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

export interface BKashQueryPaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID?: string;
  amount: string;
  transactionStatus: string;
  verificationStatus?: string;
}

export interface BKashRefundResponse {
  statusCode: string;
  statusMessage: string;
  refundTrxID?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
}

/**
 * Server-Side In-Memory Token Manager
 * Handles token granting, caching, TTL expiration, and single-flight concurrent request deduplication.
 */
class BKashTokenManager {
  private static cachedToken: string | null = null;
  private static tokenExpiresAt: number = 0;
  private static activeGrantPromise: Promise<string> | null = null;

  /**
   * Returns a valid id_token, reusing cached token if valid, or issuing a new grant.
   */
  static async getToken(config: BKashConfig): Promise<string> {
    const now = Date.now();

    // Reuse cached token if it has at least 5 minutes remaining
    if (this.cachedToken && this.tokenExpiresAt > now + 300_000) {
      return this.cachedToken;
    }

    // Single-flight deduplication: if an active grant request is already in-flight, await it
    if (this.activeGrantPromise) {
      return await this.activeGrantPromise;
    }

    // Initiate grant request
    this.activeGrantPromise = (async () => {
      try {
        const url = `${config.base_url}/tokenized/checkout/token/grant`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            username: config.username,
            password: config.password,
          },
          body: JSON.stringify({
            app_key: config.app_key,
            app_secret: config.app_secret,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`bKash token grant HTTP error (${res.status}): ${errText}`);
        }

        const data: BKashGrantTokenResponse = await res.json();
        if (data.statusCode && data.statusCode !== "0000") {
          throw new Error(`bKash token grant rejected: [${data.statusCode}] ${data.statusMessage}`);
        }

        if (!data.id_token) {
          throw new Error("bKash token grant returned no id_token");
        }

        this.cachedToken = data.id_token;
        const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
        this.tokenExpiresAt = Date.now() + expiresInSec * 1000;

        return data.id_token;
      } finally {
        this.activeGrantPromise = null;
      }
    })();

    return await this.activeGrantPromise;
  }

  /**
   * Clears the in-memory cached token (e.g., when receiving an unauthorized response).
   */
  static clearCache() {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }
}

/**
 * Production-ready bKash Tokenized Checkout Service (v1.2.0-beta)
 */
export class BKashService {
  /**
   * Resolves bKash configuration hierarchically:
   * 1. Environment variables
   * 2. DB payment_providers table ('bkash')
   * 3. DB settings table ('payment_bkash')
   */
  static async getConfig(): Promise<BKashConfig> {
    const isSandboxEnv = process.env.BKASH_SANDBOX === "true" || process.env.NODE_ENV !== "production";
    const defaultSandboxBase = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
    const defaultProdBase = "https://tokenized.pay.bka.sh/v1.2.0-beta";

    // 1. Check environment variables
    const envAppKey = process.env.BKASH_APP_KEY;
    const envAppSecret = process.env.BKASH_APP_SECRET;
    const envUsername = process.env.BKASH_USERNAME;
    const envPassword = process.env.BKASH_PASSWORD;
    const envBaseUrl = process.env.BKASH_BASE_URL;

    if (envAppKey && envAppSecret && envUsername && envPassword) {
      return {
        app_key: envAppKey,
        app_secret: envAppSecret,
        username: envUsername,
        password: envPassword,
        base_url: envBaseUrl || (isSandboxEnv ? defaultSandboxBase : defaultProdBase),
        is_sandbox: isSandboxEnv,
      };
    }

    // 2. Check DB payment_providers row
    try {
      const supabase = createAdminClient();
      const { data: provider } = await supabase
        .from("payment_providers")
        .select("config")
        .eq("code", "bkash")
        .maybeSingle();

      const conf = provider?.config as Record<string, any> | null;
      if (conf?.app_key && conf?.app_secret && conf?.username && conf?.password) {
        const isSandbox = conf.is_sandbox ?? isSandboxEnv;
        return {
          app_key: conf.app_key,
          app_secret: conf.app_secret,
          username: conf.username,
          password: conf.password,
          base_url: conf.base_url || (isSandbox ? defaultSandboxBase : defaultProdBase),
          is_sandbox: isSandbox,
        };
      }

      // 3. Check DB settings table
      const { data: settingRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "payment_bkash")
        .maybeSingle();

      const settingVal = settingRow?.value as Record<string, any> | null;
      if (settingVal?.app_key && settingVal?.app_secret && settingVal?.username && settingVal?.password) {
        const isSandbox = settingVal.sandbox === "true" || settingVal.is_sandbox === true;
        return {
          app_key: settingVal.app_key,
          app_secret: settingVal.app_secret,
          username: settingVal.username,
          password: settingVal.password,
          base_url: settingVal.base_url || (isSandbox ? defaultSandboxBase : defaultProdBase),
          is_sandbox: isSandbox,
        };
      }
    } catch (dbErr) {
      console.error("[bKash Service] Database config lookup failed:", dbErr);
    }

    // Fallback to placeholder/sandbox config if not configured
    return {
      app_key: envAppKey || "",
      app_secret: envAppSecret || "",
      username: envUsername || "",
      password: envPassword || "",
      base_url: envBaseUrl || defaultSandboxBase,
      is_sandbox: true,
    };
  }

  /**
   * Checks if genuine bKash credentials have been configured.
   */
  static async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return Boolean(
      config.app_key &&
      config.app_secret &&
      config.username &&
      config.password &&
      config.app_key !== "your-bkash-app-key"
    );
  }

  /**
   * Acquire authentication token
   */
  static async getAuthToken(): Promise<string> {
    const config = await this.getConfig();
    return await BKashTokenManager.getToken(config);
  }

  /**
   * Step 1: Create Payment
   * Calls bKash Tokenized Checkout Create API (mode: '0011', intent: 'sale')
   */
  static async createPayment(params: {
    orderId: string;
    orderNumber: string;
    amount: number;
    customerPhone?: string | null;
    callbackUrl?: string;
  }): Promise<BKashCreatePaymentResponse> {
    const config = await this.getConfig();
    const token = await BKashTokenManager.getToken(config);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackURL = params.callbackUrl || `${appUrl}/api/payment/bkash/callback`;

    // Ensure amount is formatted strictly with 2 decimal places (e.g. "1200.00")
    const formattedAmount = params.amount.toFixed(2);
    const payerReference = params.customerPhone || params.orderNumber;

    const payload = {
      mode: "0011",
      payerReference,
      callbackURL,
      amount: formattedAmount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: params.orderNumber,
    };

    const url = `${config.base_url}/tokenized/checkout/create`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-APP-Key": config.app_key,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[bKash Create Payment] HTTP Error:", res.status, errText);
      throw new Error(`bKash payment initiation failed (${res.status}): ${errText}`);
    }

    const data: BKashCreatePaymentResponse = await res.json();
    if (data.statusCode && data.statusCode !== "0000") {
      console.error("[bKash Create Payment] Provider Rejected:", data.statusCode, data.statusMessage);
      throw new Error(`bKash rejected payment: [${data.statusCode}] ${data.statusMessage}`);
    }

    if (!data.paymentID || !data.bkashURL) {
      console.error("[bKash Create Payment] Missing paymentID or bkashURL in response:", data);
      throw new Error("bKash response missing paymentID or gateway checkout URL");
    }

    return data;
  }

  /**
   * Step 2: Execute / Capture Payment
   * Calls bKash Tokenized Checkout Execute API after customer approves in gateway.
   */
  static async executePayment(paymentID: string): Promise<BKashExecutePaymentResponse> {
    const config = await this.getConfig();
    let token = await BKashTokenManager.getToken(config);

    const url = `${config.base_url}/tokenized/checkout/execute`;

    let res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-APP-Key": config.app_key,
      },
      body: JSON.stringify({ paymentID }),
    });

    // Handle 401 unauthorized (token expired between create and execute)
    if (res.status === 401) {
      console.warn("[bKash Execute Payment] Token expired, refreshing token and retrying execute...");
      BKashTokenManager.clearCache();
      token = await BKashTokenManager.getToken(config);
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
          "X-APP-Key": config.app_key,
        },
        body: JSON.stringify({ paymentID }),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("[bKash Execute Payment] HTTP Error:", res.status, errText);
      throw new Error(`bKash execution failed (${res.status}): ${errText}`);
    }

    const data: BKashExecutePaymentResponse = await res.json();
    return data;
  }

  /**
   * Step 3: Query Payment Status
   * Queries status of an existing paymentID from bKash server.
   */
  static async queryPayment(paymentID: string): Promise<BKashQueryPaymentResponse> {
    const config = await this.getConfig();
    const token = await BKashTokenManager.getToken(config);

    const url = `${config.base_url}/tokenized/checkout/payment/status`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-APP-Key": config.app_key,
      },
      body: JSON.stringify({ paymentID }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`bKash query status HTTP error (${res.status}): ${errText}`);
    }

    const data: BKashQueryPaymentResponse = await res.json();
    return data;
  }

  /**
   * Step 4: Process Refund
   * Initiates refund for a completed bKash transaction.
   */
  static async refundPayment(params: {
    paymentID: string;
    amount: number;
    trxID: string;
    sku?: string;
    reason?: string;
  }): Promise<BKashRefundResponse> {
    const config = await this.getConfig();
    const token = await BKashTokenManager.getToken(config);

    const payload = {
      paymentID: params.paymentID,
      amount: params.amount.toFixed(2),
      trxID: params.trxID,
      sku: params.sku || "REFUND",
      reason: params.reason || "Customer refund request",
    };

    const url = `${config.base_url}/tokenized/checkout/payment/refund`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-APP-Key": config.app_key,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`bKash refund HTTP error (${res.status}): ${errText}`);
    }

    const data: BKashRefundResponse = await res.json();
    return data;
  }
}
