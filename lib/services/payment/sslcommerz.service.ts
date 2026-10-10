import { createAdminClient } from "@/lib/supabase/admin-client";
import crypto from "crypto";

export interface SSLCommerzConfig {
  store_id: string;
  store_passwd: string;
  is_sandbox: boolean;
  init_url: string;
  validation_url: string;
  query_url: string;
  refund_url: string;
}

export interface SSLCommerzInitParams {
  orderId: string;
  orderNumber: string;
  tranId: string;
  amount: number;
  currency?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerPostcode?: string | null;
  customerCountry?: string | null;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingPostcode?: string | null;
  shippingCountry?: string | null;
  itemsCount?: number;
  productName?: string;
  productCategory?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  sessionId?: string;
}

export interface SSLCommerzInitResponse {
  status: "SUCCESS" | "FAILED";
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  redirectGatewayURL?: string;
  gw?: Record<string, string>;
}

export interface SSLCommerzValidationResponse {
  status: "VALID" | "VALIDATED" | "INVALID_TRANSACTION" | string;
  tran_date: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount?: string;
  currency: string;
  bank_tran_id?: string;
  card_type?: string;
  card_no?: string;
  card_issuer?: string;
  card_brand?: string;
  card_sub_brand?: string;
  card_issuer_country?: string;
  card_issuer_country_code?: string;
  currency_type?: string;
  currency_amount?: string;
  currency_rate?: string;
  base_fair?: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
  risk_level?: string;
  risk_title?: string;
  error?: string;
}

export interface SSLCommerzRefundParams {
  bankTranId: string;
  refundAmount: number;
  refundRemarks: string;
  refeId?: string;
}

export interface SSLCommerzRefundResponse {
  status: string;
  refund_ref_id?: string;
  trans_id?: string;
  errorReason?: string;
}

/**
 * Production-ready SSLCommerz Payment Gateway Service (v4 API)
 * Implements authoritative session creation, server-side transaction validation,
 * order querying, IPN signature verification, and refund support.
 */
function isValidCredential(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === "testbox" || lower === "qwerty") return true;
  if (
    lower.includes("your_store") ||
    lower.includes("your-store") ||
    lower.includes("your_store_id") ||
    lower.includes("your_store_passwd") ||
    lower.includes("your-sslcommerz") ||
    lower.includes("your_password") ||
    lower.includes("example")
  ) {
    return false;
  }
  return true;
}

export class SSLCommerzService {
  private static readonly SANDBOX_BASE = "https://sandbox.sslcommerz.com";
  private static readonly PROD_BASE = "https://securepay.sslcommerz.com";

  /**
   * Resolves SSLCommerz configuration hierarchically:
   * 1. DB settings table ('payment_sslcommerz') - Prioritized so dashboard updates take immediate effect
   * 2. DB payment_providers table ('sslcommerz')
   * 3. Environment variables (SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD / SSLCOMMERZ_STORE_PASSWD)
   */
  static async getConfig(): Promise<SSLCommerzConfig> {
    const isSandboxEnv =
      process.env.SSLCOMMERZ_IS_SANDBOX === "true" ||
      process.env.NODE_ENV !== "production";

    // 1. Check DB settings table ('payment_sslcommerz') - Highest priority (Dashboard)
    try {
      const supabase = createAdminClient();
      const { data: settingRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "payment_sslcommerz")
        .maybeSingle();

      const settingVal = settingRow?.value as Record<string, any> | null;
      const dbStoreId = settingVal?.store_id?.toString().trim();
      let dbStorePass = (
        settingVal?.store_password ||
        settingVal?.store_passwd ||
        settingVal?.store_pass
      )?.toString().trim();

      if (dbStorePass && dbStorePass.includes(":") && dbStorePass.split(":").length === 3) {
        try {
          const { decrypt } = await import("@/utils/encryption.util");
          dbStorePass = decrypt(dbStorePass);
        } catch {
          // If decryption fails or not encrypted with current key, keep as-is
        }
      }

      if (isValidCredential(dbStoreId) && isValidCredential(dbStorePass)) {
        let isSandbox = isSandboxEnv;
        if (settingVal?.sandbox !== undefined) {
          isSandbox = settingVal.sandbox === true || settingVal.sandbox === "true";
        } else if (settingVal?.is_sandbox !== undefined) {
          isSandbox = settingVal.is_sandbox === true || settingVal.is_sandbox === "true";
        }
        const baseUrl = isSandbox ? this.SANDBOX_BASE : this.PROD_BASE;
        return {
          store_id: dbStoreId!,
          store_passwd: dbStorePass!,
          is_sandbox: isSandbox,
          init_url: `${baseUrl}/gwprocess/v4/api.php`,
          validation_url: `${baseUrl}/validator/api/validationserverAPI.php`,
          query_url: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
          refund_url: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        };
      }

      // 2. Check DB payment_providers table ('sslcommerz')
      const { data: provider } = await supabase
        .from("payment_providers")
        .select("config")
        .eq("code", "sslcommerz")
        .maybeSingle();

      const conf = provider?.config as Record<string, any> | null;
      const provStoreId = conf?.store_id?.toString().trim();
      const provStorePass = (
        conf?.store_password ||
        conf?.store_passwd ||
        conf?.store_pass
      )?.toString().trim();

      if (isValidCredential(provStoreId) && isValidCredential(provStorePass)) {
        let isSandbox = isSandboxEnv;
        if (conf?.sandbox !== undefined) {
          isSandbox = conf.sandbox === true || conf.sandbox === "true";
        } else if (conf?.is_sandbox !== undefined) {
          isSandbox = conf.is_sandbox === true || conf.is_sandbox === "true";
        }
        const baseUrl = isSandbox ? this.SANDBOX_BASE : this.PROD_BASE;
        return {
          store_id: provStoreId!,
          store_passwd: provStorePass!,
          is_sandbox: isSandbox,
          init_url: `${baseUrl}/gwprocess/v4/api.php`,
          validation_url: `${baseUrl}/validator/api/validationserverAPI.php`,
          query_url: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
          refund_url: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        };
      }
    } catch (dbErr) {
      console.error("[SSLCommerz Service] Database config lookup error:", dbErr);
    }

    // 3. Fallback to environment variables (if not placeholder dummy values)
    const envStoreId = process.env.SSLCOMMERZ_STORE_ID?.trim();
    const envStorePasswd = (
      process.env.SSLCOMMERZ_STORE_PASSWORD || process.env.SSLCOMMERZ_STORE_PASSWD
    )?.trim();
    const envSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== undefined
      ? process.env.SSLCOMMERZ_IS_SANDBOX === "true"
      : isSandboxEnv;

    if (isValidCredential(envStoreId) && isValidCredential(envStorePasswd)) {
      const baseUrl = envSandbox ? this.SANDBOX_BASE : this.PROD_BASE;
      return {
        store_id: envStoreId!,
        store_passwd: envStorePasswd!,
        is_sandbox: envSandbox,
        init_url: `${baseUrl}/gwprocess/v4/api.php`,
        validation_url: `${baseUrl}/validator/api/validationserverAPI.php`,
        query_url: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        refund_url: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
      };
    }

    // Default fallback: in sandbox/dev mode, fallback to official SSLCommerz test credentials
    const fallbackStoreId = (isValidCredential(envStoreId) ? envStoreId : isSandboxEnv ? "testbox" : "") || "";
    const fallbackStorePasswd = (isValidCredential(envStorePasswd) ? envStorePasswd : isSandboxEnv ? "qwerty" : "") || "";

    const defaultBase = isSandboxEnv ? this.SANDBOX_BASE : this.PROD_BASE;
    return {
      store_id: fallbackStoreId,
      store_passwd: fallbackStorePasswd,
      is_sandbox: isSandboxEnv,
      init_url: `${defaultBase}/gwprocess/v4/api.php`,
      validation_url: `${defaultBase}/validator/api/validationserverAPI.php`,
      query_url: `${defaultBase}/validator/api/merchantTransIDvalidationAPI.php`,
      refund_url: `${defaultBase}/validator/api/merchantTransIDvalidationAPI.php`,
    };
  }

  /**
   * Checks if genuine SSLCommerz merchant credentials are configured.
   */
  static async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return Boolean(
      config.store_id &&
      config.store_passwd &&
      isValidCredential(config.store_id) &&
      isValidCredential(config.store_passwd)
    );
  }

  /**
   * Initiates payment session with SSLCommerz v4 API
   */
  static async initiatePayment(params: SSLCommerzInitParams): Promise<SSLCommerzInitResponse> {
    const config = await this.getConfig();

    if (!config.store_id || !config.store_passwd) {
      throw new Error("SSLCommerz credentials are not configured");
    }

    // Strictly format amount to 2 decimal places
    const totalAmount = Number(params.amount).toFixed(2);
    const currency = params.currency || "BDT";

    const formData = new URLSearchParams();
    formData.append("store_id", config.store_id);
    formData.append("store_passwd", config.store_passwd);
    formData.append("total_amount", totalAmount);
    formData.append("currency", currency);
    formData.append("tran_id", params.tranId);
    formData.append("success_url", params.successUrl);
    formData.append("fail_url", params.failUrl);
    formData.append("cancel_url", params.cancelUrl);
    formData.append("ipn_url", params.ipnUrl);

    // Customer Information
    formData.append("cus_name", (params.customerName || "Anchor Customer").trim());
    formData.append("cus_email", (params.customerEmail || "customer@anchorfashion.com").trim());
    formData.append("cus_add1", (params.customerAddress || "Dhaka, Bangladesh").trim());
    formData.append("cus_city", (params.customerCity || "Dhaka").trim());
    formData.append("cus_postcode", (params.customerPostcode || "1200").trim());
    formData.append("cus_country", (params.customerCountry || "Bangladesh").trim());
    formData.append("cus_phone", (params.customerPhone || "01700000000").trim());

    // Shipment Information
    formData.append("shipping_method", "Courier");
    formData.append("num_of_item", String(params.itemsCount || 1));
    formData.append("ship_name", (params.shippingName || params.customerName || "Anchor Customer").trim());
    formData.append("ship_add1", (params.shippingAddress || params.customerAddress || "Dhaka").trim());
    formData.append("ship_city", (params.shippingCity || params.customerCity || "Dhaka").trim());
    formData.append("ship_postcode", (params.shippingPostcode || params.customerPostcode || "1200").trim());
    formData.append("ship_country", (params.shippingCountry || params.customerCountry || "Bangladesh").trim());

    // Product Information
    formData.append("product_name", params.productName || "Anchor Fashion Products");
    formData.append("product_category", params.productCategory || "Clothing");
    formData.append("product_profile", "physical-goods");

    // Pass custom tracking values
    formData.append("value_a", params.orderId);
    formData.append("value_b", params.sessionId || "");
    formData.append("value_c", params.orderNumber);
    formData.append("value_d", "anchor_fashion");

    const res = await fetch(config.init_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SSLCommerz HTTP initiation error (${res.status}): ${errText}`);
    }

    const data: SSLCommerzInitResponse = await res.json();

    if (data.status !== "SUCCESS" || (!data.GatewayPageURL && !data.redirectGatewayURL)) {
      throw new Error(
        `SSLCommerz session creation failed: ${data.failedreason || "Unknown provider rejection"}`
      );
    }

    return {
      status: "SUCCESS",
      sessionkey: data.sessionkey,
      GatewayPageURL: data.GatewayPageURL || data.redirectGatewayURL,
      gw: data.gw,
    };
  }

  /**
   * Authoritative Server-Side Transaction Validation using official validationserverAPI.php
   * Validates transaction legitimacy directly against SSLCommerz servers.
   */
  static async validateTransaction(
    valId: string,
    tranId: string
  ): Promise<SSLCommerzValidationResponse> {
    const config = await this.getConfig();

    const queryParams = new URLSearchParams({
      val_id: valId,
      store_id: config.store_id,
      store_passwd: config.store_passwd,
      format: "json",
    });

    const url = `${config.validation_url}?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SSLCommerz validation server HTTP error (${res.status}): ${errText}`);
    }

    const data: SSLCommerzValidationResponse = await res.json();
    return data;
  }

  /**
   * Authoritative Transaction Query by Merchant Transaction ID
   */
  static async queryTransaction(tranId: string): Promise<any> {
    const config = await this.getConfig();

    const queryParams = new URLSearchParams({
      tran_id: tranId,
      store_id: config.store_id,
      store_passwd: config.store_passwd,
      format: "json",
    });

    const url = `${config.query_url}?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SSLCommerz merchant transaction query HTTP error (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Verifies the MD5 verify_sign from callback/IPN payload
   */
  static verifySignature(payload: Record<string, any>, storePasswd: string): boolean {
    if (!payload || !payload.verify_sign || !payload.verify_key) {
      return false;
    }

    const verifySign = payload.verify_sign;
    const verifyKeys = (payload.verify_key as string).split(",");

    const sortedMap: Record<string, string> = {};
    for (const key of verifyKeys) {
      if (key in payload) {
        sortedMap[key] = String(payload[key]);
      }
    }

    const passHash = crypto.createHash("md5").update(storePasswd).digest("hex");
    const paramString =
      Object.keys(sortedMap)
        .sort()
        .map((k) => `${k}=${encodeURIComponent(sortedMap[k])}`)
        .join("&") +
      `&store_passwd=${passHash}`;

    const calculatedSign = crypto.createHash("md5").update(paramString).digest("hex");
    return calculatedSign.toLowerCase() === verifySign.toLowerCase();
  }

  /**
   * Refund API Interface for SSLCommerz (Prompt 11/19 return/refund compatibility)
   */
  static async initiateRefund(params: SSLCommerzRefundParams): Promise<SSLCommerzRefundResponse> {
    const config = await this.getConfig();

    const queryParams = new URLSearchParams({
      bank_tran_id: params.bankTranId,
      refund_amount: Number(params.refundAmount).toFixed(2),
      refund_remarks: params.refundRemarks,
      refe_id: params.refeId || `REF-${Date.now()}`,
      store_id: config.store_id,
      store_passwd: config.store_passwd,
      format: "json",
    });

    const url = `${config.refund_url}?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SSLCommerz refund HTTP error (${res.status}): ${errText}`);
    }

    return await res.json();
  }
}
