import { createAdminClient } from "@/lib/supabase/admin-client";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CodFraudConfig {
  enabled: boolean;
  cod_high_value_threshold: number;
  otp_required_for_high_value: boolean;
  otp_required_for_first_order: boolean;
  max_cod_risk_score: number;
  otp_expiry_minutes: number;
  otp_max_attempts: number;
  otp_resend_cooldown_seconds: number;
  duplicate_order_window_minutes: number;
}

export const DEFAULT_COD_FRAUD_CONFIG: CodFraudConfig = {
  enabled: true,
  cod_high_value_threshold: 3000,
  otp_required_for_high_value: true,
  otp_required_for_first_order: true,
  max_cod_risk_score: 60,
  otp_expiry_minutes: 10,
  otp_max_attempts: 5,
  otp_resend_cooldown_seconds: 60,
  duplicate_order_window_minutes: 15,
};

export interface CodRiskInput {
  customerId?: string | null;
  email: string;
  phone: string;
  totalAmount: number;
  itemsCount?: number;
  shippingAddress?: {
    address_line_1?: string;
    city?: string;
    postal_code?: string;
  };
}

export interface CodRiskEvaluation {
  riskLevel: RiskLevel;
  riskScore: number;
  requiresVerification: boolean;
  reasons: string[];
  isTrustedCustomer: boolean;
  isFirstTimeCustomer: boolean;
  configUsed: {
    threshold: number;
    enabled: boolean;
  };
}

export class CodRiskService {
  /**
   * Resolve authoritative COD fraud configuration from DB settings with fallback to defaults.
   */
  static async getConfig(): Promise<CodFraudConfig> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "cod_fraud_settings")
        .maybeSingle();

      if (!error && data?.value && typeof data.value === "object") {
        return {
          ...DEFAULT_COD_FRAUD_CONFIG,
          ...data.value,
        };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_COD_FRAUD_CONFIG;
  }

  /**
   * Standardize phone number for reliable matching (e.g., "+88017..." vs "017...")
   */
  static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("880")) {
      return digits.substring(2);
    }
    return digits;
  }

  /**
   * Standardize address string for fuzzy comparison
   */
  static normalizeAddress(line1?: string, city?: string): string {
    const raw = `${line1 || ""} ${city || ""}`.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
    return raw.replace(/\s+/g, " ");
  }

  /**
   * Evaluates COD risk deterministically based on real database history.
   */
  static async evaluateRisk(input: CodRiskInput): Promise<CodRiskEvaluation> {
    const config = await this.getConfig();

    // If COD fraud shield is disabled, return clean LOW risk
    if (!config.enabled) {
      return {
        riskLevel: "LOW",
        riskScore: 0,
        requiresVerification: false,
        reasons: ["COD Fraud Shield disabled in settings"],
        isTrustedCustomer: true,
        isFirstTimeCustomer: false,
        configUsed: { threshold: config.cod_high_value_threshold, enabled: false },
      };
    }

    const supabase = createAdminClient();
    const reasons: string[] = [];
    let score = 0;
    let isFirstTimeCustomer = false;
    let isTrustedCustomer = false;

    const normalizedPhone = this.normalizePhone(input.phone);
    const normalizedEmail = (input.email || "").toLowerCase().trim();

    // -------------------------------------------------------------
    // Signal 1: Query Past Orders History (by Customer ID, Phone, or Email)
    // -------------------------------------------------------------
    let pastOrders: any[] = [];

    try {
      // 1a. Find order IDs associated with the customer's phone or email
      const { data: matchedAddresses } = await supabase
        .from("order_addresses")
        .select("order_id, phone, email")
        .or(`email.ilike.${normalizedEmail},phone.ilike.%${normalizedPhone.slice(-8)}%`)
        .limit(50);

      const matchedOrderIds = new Set<string>();
      if (matchedAddresses) {
        for (const addr of matchedAddresses) {
          if (addr.order_id) matchedOrderIds.add(addr.order_id);
        }
      }

      // 1b. Query orders matching IDs or customer_id
      let query = supabase
        .from("orders")
        .select("id, status, grand_total, created_at, cancelled_at, delivered_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (input.customerId && matchedOrderIds.size > 0) {
        query = query.or(`customer_id.eq.${input.customerId},id.in.(${Array.from(matchedOrderIds).join(",")})`);
      } else if (input.customerId) {
        query = query.eq("customer_id", input.customerId);
      } else if (matchedOrderIds.size > 0) {
        query = query.in("id", Array.from(matchedOrderIds));
      } else {
        query = null as any;
      }

      if (query) {
        const { data: orderData } = await query;
        if (orderData) {
          pastOrders = orderData;
        }
      }
    } catch (dbErr) {
      console.warn("[CodRiskService] Could not retrieve order history, proceeding cautiously:", dbErr);
    }

    // -------------------------------------------------------------
    // Signal 2: Evaluate Customer History (Rule B & Trust Credit)
    // -------------------------------------------------------------
    if (pastOrders.length === 0) {
      isFirstTimeCustomer = true;
      score += 20;
      reasons.push("First-time customer placing a Cash on Delivery order (+20)");
    } else {
      const deliveredCount = pastOrders.filter(
        (o) => o.status === "delivered" || o.status === "completed"
      ).length;
      const cancelledCount = pastOrders.filter(
        (o) => o.status === "cancelled" || o.status === "failed"
      ).length;
      const returnedCount = pastOrders.filter(
        (o) => o.status === "returned" || o.status === "refunded"
      ).length;

      // Check trusted customer criteria: >= 2 successfully delivered orders and 0 failed/returned
      if (deliveredCount >= 2 && returnedCount === 0 && cancelledCount === 0) {
        isTrustedCustomer = true;
        score -= 30; // Trust discount
        reasons.push(
          `Trusted returning customer with ${deliveredCount} successful deliveries (-30)`
        );
      }

      // Rule C: Suspicious Phone / Cancellation History
      if (cancelledCount >= 2) {
        score += 30;
        reasons.push(
          `Phone/account associated with ${cancelledCount} previously cancelled orders (+30)`
        );
      }

      if (returnedCount > 0) {
        score += 35;
        reasons.push(
          `Phone/account associated with ${returnedCount} previous returned/failed deliveries (+35)`
        );
      }

      // Check cancellation ratio
      const totalConcluded = deliveredCount + cancelledCount + returnedCount;
      if (totalConcluded >= 2) {
        const cancelRatio = cancelledCount / totalConcluded;
        if (cancelRatio >= 0.5) {
          score += 25;
          reasons.push(
            `High cancellation rate (${Math.round(cancelRatio * 100)}% of previous orders cancelled) (+25)`
          );
        }
      }
    }

    // -------------------------------------------------------------
    // Signal 3: High-Value COD (Rule A)
    // -------------------------------------------------------------
    if (input.totalAmount > config.cod_high_value_threshold) {
      score += 25;
      reasons.push(
        `Order value (৳${input.totalAmount.toLocaleString()}) exceeds COD verification threshold of ৳${config.cod_high_value_threshold.toLocaleString()} (+25)`
      );
    }

    if (input.totalAmount > 10000) {
      score += 25;
      reasons.push(
        `Order value (৳${input.totalAmount.toLocaleString()}) exceeds high-risk threshold of ৳10,000 (+25)`
      );
    }

    // -------------------------------------------------------------
    // Signal 4: Duplicate / Rapid Consecutive Order Check (Rule E)
    // -------------------------------------------------------------
    if (pastOrders.length > 0) {
      const windowMs = config.duplicate_order_window_minutes * 60 * 1000;
      const now = Date.now();
      const recentOrders = pastOrders.filter((o) => {
        const orderTime = new Date(o.created_at).getTime();
        return (
          now - orderTime <= windowMs &&
          o.status !== "cancelled" &&
          o.status !== "failed"
        );
      });

      if (recentOrders.length > 0) {
        score += 40;
        reasons.push(
          `Rapid order placed: ${recentOrders.length} order(s) already placed within the last ${config.duplicate_order_window_minutes} minutes (+40)`
        );
      }
    }

    // Ensure score does not drop below 0
    score = Math.max(0, score);

    // -------------------------------------------------------------
    // Classification: LOW, MEDIUM, HIGH
    // -------------------------------------------------------------
    let riskLevel: RiskLevel = "LOW";
    if (score >= config.max_cod_risk_score) {
      riskLevel = "HIGH";
    } else if (score >= 30) {
      riskLevel = "MEDIUM";
    }

    // -------------------------------------------------------------
    // Decision: Does this order require OTP verification?
    // -------------------------------------------------------------
    let requiresVerification = false;

    // Rule A enforcement: High-value orders require verification unless trusted customer
    if (
      config.otp_required_for_high_value &&
      input.totalAmount > config.cod_high_value_threshold
    ) {
      if (!isTrustedCustomer) {
        requiresVerification = true;
      }
    }

    // Rule B enforcement: First-time customers require verification if enabled
    if (config.otp_required_for_first_order && isFirstTimeCustomer) {
      requiresVerification = true;
    }

    // Medium or High risk score enforcement
    if (riskLevel === "HIGH" || riskLevel === "MEDIUM") {
      requiresVerification = true;
    }

    return {
      riskLevel,
      riskScore: score,
      requiresVerification,
      reasons,
      isTrustedCustomer,
      isFirstTimeCustomer,
      configUsed: {
        threshold: config.cod_high_value_threshold,
        enabled: config.enabled,
      },
    };
  }
}
