import { createAdminClient } from "@/lib/supabase/server";
import {
  SmsLog,
  SmsSendResult,
  SendSmsOptions,
  AlphaSmsApiResponse,
} from "@/types/sms.types";

const ALPHA_SMS_ENDPOINT = "https://api.sms.net.bd/sendsms";
const BRAND_NAME = "Anchor Fashion";

export class AlphaSmsService {
  /**
   * Normalize a phone number to standard Bangladesh format: 8801XXXXXXXXX (13 digits)
   * Strips spaces, hyphens, plus signs, parentheses.
   */
  static normalizePhoneNumber(rawPhone: string): {
    valid: boolean;
    normalized: string;
    reason?: string;
  } {
    if (!rawPhone || typeof rawPhone !== "string") {
      return { valid: false, normalized: "", reason: "Phone number is empty or not a string." };
    }

    // Remove all non-digit characters except leading '+'
    let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.substring(1);
    }

    // Convert local format 01XXXXXXXXX (11 digits) to 8801XXXXXXXXX (13 digits)
    if (/^01[3-9]\d{8}$/.test(cleaned)) {
      cleaned = "88" + cleaned;
    }

    // Check if valid Bangladeshi mobile format (88013 - 88019, 13 digits)
    const isValidBdMobile = /^8801[3-9]\d{8}$/.test(cleaned);

    if (!isValidBdMobile) {
      return {
        valid: false,
        normalized: cleaned,
        reason: `Invalid Bangladeshi mobile number: ${rawPhone}. Expected format 01XXXXXXXXX or 8801XXXXXXXXX (11 or 13 digits).`,
      };
    }

    return { valid: true, normalized: cleaned };
  }

  /**
   * Send a single SMS via Alpha SMS REST API
   * Handles normalization, test mode, timeout, provider errors, and database logging.
   */
  static async sendSMS(options: SendSmsOptions): Promise<SmsSendResult> {
    const { to, message, orderId, type = "ORDER_CONFIRMATION" } = options;

    // 1. Phone number normalization & validation
    const { valid, normalized, reason } = this.normalizePhoneNumber(to);
    if (!valid) {
      console.warn(`[Alpha SMS] Phone validation failed: ${reason}`);
      await this.recordSmsLog({
        order_id: orderId || null,
        phone: normalized || to,
        message,
        type,
        status: "FAILED",
        provider: "ALPHA_SMS",
        error_message: reason || "Invalid phone number format",
      });

      return {
        success: false,
        status: "FAILED",
        phone: to,
        message,
        error: reason,
      };
    }

    const apiKey = process.env.ALPHA_SMS_API_KEY || "";
    const isSmsEnabled = process.env.SMS_ENABLED !== "false";
    const isTestMode =
      process.env.SMS_TEST_MODE === "true" ||
      !apiKey ||
      apiKey === "your_alpha_sms_api_key" ||
      apiKey.includes("your_");

    // 2. Check if SMS sending is disabled globally
    if (!isSmsEnabled) {
      console.log(`[Alpha SMS] SMS_ENABLED is false. Skipping dispatch to ${normalized}.`);
      return {
        success: true,
        status: "SKIPPED",
        phone: normalized,
        message,
        skipped: true,
        reason: "SMS sending is disabled via SMS_ENABLED=false.",
      };
    }

    // 3. Test Mode / Simulated Send (does not consume SMS credits)
    if (isTestMode) {
      const mockRequestId = `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      console.log(
        `[Alpha SMS] [TEST MODE] Simulated SMS sent to ${normalized}. RequestID: ${mockRequestId}. Message: "${message}"`
      );

      const log = await this.recordSmsLog({
        order_id: orderId || null,
        phone: normalized,
        message,
        type,
        status: "SENT",
        provider: "ALPHA_SMS",
        request_id: mockRequestId,
        response: {
          test_mode: true,
          mock: true,
          error: 0,
          msg: "Success (Test Mode Simulated)",
          data: { request_id: mockRequestId },
        },
      });

      return {
        success: true,
        status: "SENT",
        phone: normalized,
        message,
        requestId: mockRequestId,
        isTestMode: true,
        logId: log?.id,
      };
    }

    // 4. Live Alpha SMS REST API Call
    try {
      const params = new URLSearchParams();
      params.append("api_key", apiKey);
      params.append("msg", message);
      params.append("to", normalized);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

      const response = await fetch(ALPHA_SMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: AlphaSmsApiResponse;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: -1, msg: responseText };
      }

      const isSuccess = response.ok && responseData.error === 0;
      const requestId =
        responseData.data?.request_id !== undefined
          ? String(responseData.data.request_id)
          : responseData.request_id !== undefined
          ? String(responseData.request_id)
          : null;

      const errorMessage = isSuccess
        ? null
        : responseData.msg ||
          `Alpha SMS API error (code: ${responseData.error}, HTTP ${response.status})`;

      // 5. Audit Log to Database
      const log = await this.recordSmsLog({
        order_id: orderId || null,
        phone: normalized,
        message,
        type,
        status: isSuccess ? "SENT" : "FAILED",
        provider: "ALPHA_SMS",
        request_id: requestId,
        response: responseData,
        error_message: errorMessage,
      });

      if (!isSuccess) {
        console.error(`[Alpha SMS] Delivery failed to ${normalized}:`, errorMessage);
        return {
          success: false,
          status: "FAILED",
          phone: normalized,
          message,
          requestId,
          error: errorMessage,
          logId: log?.id,
        };
      }

      console.log(
        `[Alpha SMS] Delivery successful to ${normalized}. RequestID: ${requestId}`
      );

      return {
        success: true,
        status: "SENT",
        phone: normalized,
        message,
        requestId,
        logId: log?.id,
      };
    } catch (error: any) {
      const isTimeout = error.name === "AbortError";
      const errReason = isTimeout
        ? "Request timeout after 12s connecting to Alpha SMS"
        : error.message || "Network connection error";

      console.error("[Alpha SMS] Exception during sendSMS:", errReason);

      const log = await this.recordSmsLog({
        order_id: orderId || null,
        phone: normalized,
        message,
        type,
        status: "FAILED",
        provider: "ALPHA_SMS",
        error_message: errReason,
      });

      return {
        success: false,
        status: "FAILED",
        phone: normalized,
        message,
        error: errReason,
        logId: log?.id,
      };
    }
  }

  /**
   * Send order confirmation SMS
   * STRICT GUARANTEES:
   * 1. ONLY orders with status == 'confirmed' (case-insensitive) can send.
   * 2. Checks order.confirmation_sms_sent to prevent duplicate messages.
   * 3. Dynamically extracts customer name, order number, and phone number.
   * 4. Updates order.confirmation_sms_sent = true upon success.
   * 5. Never throws an exception to caller (safe for fire-and-forget).
   */
  static async sendOrderConfirmationSMS(
    orderId: string,
    options?: { force?: boolean }
  ): Promise<SmsSendResult> {
    try {
      const supabase = await createAdminClient();

      // 1. Fetch order details
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        const msg = `Order not found with ID: ${orderId} (${orderErr?.message || "No order record"})`;
        console.warn(`[Alpha SMS] ${msg}`);
        return {
          success: false,
          status: "FAILED",
          phone: "",
          message: "",
          error: msg,
        };
      }

      // Fetch order addresses separately (resilient to missing foreign key relation in schema cache)
      let addresses: any[] = [];
      try {
        const { data: addrList, error: addrErr } = await supabase
          .from("order_addresses")
          .select("*")
          .eq("order_id", orderId);

        if (!addrErr && addrList && addrList.length > 0) {
          addresses = addrList;
        }
      } catch (addrErr) {
        console.warn("[Alpha SMS] Warning fetching order_addresses:", addrErr);
      }

      // 2. Strict Confirmation Guard
      const currentStatus = (order.status || "").toLowerCase();
      if (currentStatus !== "confirmed") {
        const msg = `Order ${order.order_number} is in status '${order.status}', NOT 'CONFIRMED'. SMS aborted.`;
        console.warn(`[Alpha SMS] ${msg}`);
        return {
          success: false,
          status: "SKIPPED",
          phone: "",
          message: "",
          skipped: true,
          reason: msg,
        };
      }

      // 3. Duplicate SMS Protection
      if (!options?.force && order.confirmation_sms_sent === true) {
        const msg = `Confirmation SMS already sent for order ${order.order_number} (confirmation_sms_sent = true). Skipping duplicate.`;
        console.log(`[Alpha SMS] ${msg}`);
        return {
          success: true,
          status: "SKIPPED",
          phone: "",
          message: "",
          skipped: true,
          reason: msg,
        };
      }

      // Also check if an active successful confirmation SMS was already recorded for this order
      if (!options?.force) {
        const priorSentLog = await this.checkPriorSentLog(order.id);
        if (priorSentLog) {
          const msg = `Confirmation SMS already logged as SENT for order ${order.order_number}. Skipping duplicate.`;
          console.log(`[Alpha SMS] ${msg}`);
          // Sync confirmation_sms_sent flag
          await this.markOrderSmsSent(order.id);
          return {
            success: true,
            status: "SKIPPED",
            phone: priorSentLog.phone,
            message: priorSentLog.message,
            requestId: priorSentLog.request_id,
            skipped: true,
            reason: msg,
          };
        }
      }

      // 4. Extract Customer Name and Phone Number
      const shippingAddr =
        addresses.find((a: any) => (a.address_type || "").toUpperCase() === "SHIPPING") ||
        addresses[0];

      let phone =
        shippingAddr?.phone ||
        (order as any).phone ||
        (order as any).customer_phone ||
        "";

      // Fallback: Check customers/profiles table if phone is missing in address
      if (!phone && order.customer_id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone, first_name, last_name")
            .eq("id", order.customer_id)
            .maybeSingle();
          if (profile?.phone) phone = profile.phone;
        } catch {
          // Ignored
        }
      }

      if (!phone) {
        const msg = `No phone number found for order ${order.order_number}. Cannot send confirmation SMS.`;
        console.warn(`[Alpha SMS] ${msg}`);
        await this.recordSmsLog({
          order_id: order.id,
          phone: "UNKNOWN",
          message: "",
          type: "ORDER_CONFIRMATION",
          status: "FAILED",
          provider: "ALPHA_SMS",
          error_message: msg,
        });

        return {
          success: false,
          status: "FAILED",
          phone: "",
          message: "",
          error: msg,
        };
      }

      const firstName = shippingAddr?.first_name?.trim() || "";
      const lastName = shippingAddr?.last_name?.trim() || "";
      let customerName = [firstName, lastName].filter(Boolean).join(" ");
      if (!customerName && order.customer_id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", order.customer_id)
            .maybeSingle();
          if (profile) {
            customerName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
          }
        } catch {
          // Ignored
        }
      }
      if (!customerName) customerName = "Valued Customer";
      const orderNumber = order.order_number || order.id.slice(0, 8);

      // Fetch order items to include in SMS
      let orderItems: Array<{ product_name?: string; quantity?: number }> = [];
      try {
        const { data: itemsList } = await supabase
          .from("order_items")
          .select("product_name, quantity")
          .eq("order_id", order.id);
        if (itemsList && itemsList.length > 0) {
          orderItems = itemsList;
        }
      } catch (itemErr) {
        console.warn("[Alpha SMS] Warning fetching order_items for SMS:", itemErr);
      }

      // 5. Construct Order Confirmation SMS Content with full professional details
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://anchorfashion.com").replace(/\/+$/, "");
      const invoiceUrl = `${appUrl}/account/orders/${order.id}/invoice`;

      const message = this.formatOrderConfirmationMessage({
        customerName,
        orderNumber,
        totalAmount: order.grand_total ?? order.total_amount,
        paymentMethod: order.payment_method,
        deliveryAddress: shippingAddr?.address_line_1,
        city: shippingAddr?.city,
        items: orderItems,
        invoiceUrl,
      });

      // 6. Dispatch SMS
      const result = await this.sendSMS({
        to: phone,
        message,
        orderId: order.id,
        type: "ORDER_CONFIRMATION",
      });

      // 7. Update order confirmation_sms_sent on success
      if (result.success && result.status === "SENT") {
        await this.markOrderSmsSent(order.id);

        // Add note to order_notes for transparent audit visibility
        try {
          await supabase.from("order_notes").insert({
            order_id: order.id,
            note: `[SMS Notification] Confirmation SMS sent to ${result.phone} via Alpha SMS (Request ID: ${result.requestId || "N/A"})`,
            is_customer_visible: false,
          });
        } catch {
          // Ignored
        }
      }

      return result;
    } catch (err: any) {
      console.error("[Alpha SMS] sendOrderConfirmationSMS exception:", err);
      return {
        success: false,
        status: "FAILED",
        phone: "",
        message: "",
        error: err.message || "Unknown error during order confirmation SMS dispatch",
      };
    }
  }

  /**
   * Formats a professional, highly detailed order confirmation message.
   * Includes Customer Name, Order Number, Items summary, Total Amount, Payment Method, Delivery Address, and Brand Name.
   */
  static formatOrderConfirmationMessage(details: {
    customerName: string;
    orderNumber: string;
    totalAmount?: number | string | null;
    paymentMethod?: string | null;
    deliveryAddress?: string | null;
    city?: string | null;
    items?: Array<{ name?: string; product_name?: string; quantity?: number }> | null;
    brandName?: string;
    invoiceUrl?: string | null;
  }): string {
    const {
      customerName,
      orderNumber,
      totalAmount,
      paymentMethod,
      deliveryAddress,
      city,
      items,
      brandName = BRAND_NAME,
      invoiceUrl,
    } = details;

    const lines: string[] = [];

    // 1. Greeting
    const safeCustomer = (customerName || "Customer").trim();
    lines.push(`Dear ${safeCustomer},`);

    // 2. Order Confirmation Header
    lines.push(`Your order #${orderNumber} has been confirmed!`);

    // 3. Items Summary
    if (items && items.length > 0) {
      const validItems = items.filter((i) => i && (i.name || i.product_name));
      if (validItems.length > 0) {
        const firstItem = validItems[0];
        const firstName = (firstItem.name || firstItem.product_name || "Item").trim();
        const firstQty = firstItem.quantity && firstItem.quantity > 1 ? ` (x${firstItem.quantity})` : ` (x1)`;

        let itemsStr = "";
        if (validItems.length === 1) {
          itemsStr = `${firstName.slice(0, 28)}${firstQty}`;
        } else if (validItems.length === 2) {
          const secondItem = validItems[1];
          const secondName = (secondItem.name || secondItem.product_name || "Item").trim();
          const secondQty = secondItem.quantity && secondItem.quantity > 1 ? ` (x${secondItem.quantity})` : ` (x1)`;
          itemsStr = `${firstName.slice(0, 18)}${firstQty}, ${secondName.slice(0, 18)}${secondQty}`;
        } else {
          itemsStr = `${firstName.slice(0, 22)}${firstQty} & ${validItems.length - 1} more`;
        }
        lines.push(`Items: ${itemsStr}`);
      }
    }

    // 4. Amount and Payment Method
    const methodUpper = (paymentMethod || "").toUpperCase();
    const paymentLabel =
      methodUpper === "COD" || methodUpper === "CASH_ON_DELIVERY"
        ? "Cash on Delivery"
        : methodUpper === "BKASH"
        ? "bKash"
        : methodUpper === "NAGAD"
        ? "Nagad"
        : methodUpper === "ROCKET"
        ? "Rocket"
        : methodUpper === "SSLCOMMERZ"
        ? "Paid Online"
        : paymentMethod
        ? paymentMethod
        : "Cash on Delivery";

    if (totalAmount !== undefined && totalAmount !== null) {
      const numAmount = typeof totalAmount === "number" ? Math.round(totalAmount) : Number(totalAmount) || 0;
      const formattedAmount = `BDT ${numAmount.toLocaleString("en-US")}`;
      lines.push(`Total: ${formattedAmount} (${paymentLabel})`);
    }

    // 5. Delivery Address & City
    const addressParts = [deliveryAddress, city].filter(Boolean).map((s) => s!.trim()).filter(Boolean);
    if (addressParts.length > 0) {
      const fullAddr = addressParts.join(", ");
      const cleanAddr = fullAddr.length > 45 ? `${fullAddr.slice(0, 42)}...` : fullAddr;
      lines.push(`Delivery: ${cleanAddr}`);
    }

    // 6. Invoice Link
    if (invoiceUrl) {
      lines.push(`Invoice: ${invoiceUrl}`);
    }

    // 7. Sign-off with Brand
    lines.push(`Thank you for shopping with ${brandName}.`);

    return lines.join("\n");
  }

  /**
   * Directly dispatch an order confirmation SMS with custom payload (e.g. from store checkout modal)
   */
  static async sendCustomOrderConfirmationSMS(payload: {
    orderNumber: string;
    customerName: string;
    phone: string;
    totalAmount?: number | string | null;
    paymentMethod?: string | null;
    deliveryAddress?: string | null;
    city?: string | null;
    items?: Array<{ name?: string; product_name?: string; quantity?: number }> | null;
    orderId?: string | null;
  }): Promise<SmsSendResult> {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://anchorfashion.com").replace(/\/+$/, "");
    const targetId = payload.orderId || payload.orderNumber;
    const invoiceUrl = targetId ? `${appUrl}/account/orders/${targetId}/invoice` : undefined;

    const message = this.formatOrderConfirmationMessage({
      customerName: payload.customerName,
      orderNumber: payload.orderNumber,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      deliveryAddress: payload.deliveryAddress,
      city: payload.city,
      items: payload.items,
      invoiceUrl,
    });

    return await this.sendSMS({
      to: payload.phone,
      message,
      orderId: payload.orderId || undefined,
      type: "ORDER_CONFIRMATION",
    });
  }

  /**
   * Asynchronous fire-and-forget for custom order confirmation SMS.
   */
  static triggerCustomOrderConfirmationSmsAsync(payload: {
    orderNumber: string;
    customerName: string;
    phone: string;
    totalAmount?: number | string | null;
    paymentMethod?: string | null;
    deliveryAddress?: string | null;
    city?: string | null;
    items?: Array<{ name?: string; product_name?: string; quantity?: number }> | null;
    orderId?: string | null;
  }) {
    if (!payload?.phone) return;

    Promise.resolve().then(async () => {
      try {
        await this.sendCustomOrderConfirmationSMS(payload);
      } catch (err) {
        console.error("[Alpha SMS] Background custom async SMS dispatch error:", err);
      }
    });
  }

  /**
   * Asynchronous fire-and-forget helper.
   * Dispatches order confirmation SMS without delaying order response or blocking checkout execution.
   */
  static triggerOrderConfirmationSmsAsync(orderId: string, options?: { force?: boolean }) {
    if (!orderId) return;

    // Use Promise microtask detachment to allow immediate caller completion
    Promise.resolve().then(async () => {
      try {
        await this.sendOrderConfirmationSMS(orderId, options);
      } catch (err) {
        console.error("[Alpha SMS] Background async SMS dispatch error:", err);
      }
    });
  }

  /**
   * Record SMS in database
   * Dual-strategy: tries `sms_logs` table first; if schema cache reports table missing,
   * falls back to `communication_logs` table so logs are never lost.
   */
  static async recordSmsLog(entry: {
    order_id?: string | null;
    phone: string;
    message: string;
    type: string;
    status: "PENDING" | "SENT" | "FAILED";
    provider: string;
    request_id?: string | null;
    response?: any;
    error_message?: string | null;
  }): Promise<{ id: string } | null> {
    const supabase = await createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Try public.sms_logs
    try {
      const { data, error } = await supabase
        .from("sms_logs")
        .insert({
          order_id: entry.order_id || null,
          phone: entry.phone,
          message: entry.message,
          type: entry.type,
          status: entry.status,
          provider: entry.provider,
          request_id: entry.request_id || null,
          response: entry.response || null,
          error_message: entry.error_message || null,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("id")
        .maybeSingle();

      if (!error && data) {
        return data;
      }

      // If table doesn't exist, proceed to fallback
    } catch {
      // Ignored, proceed to fallback
    }

    // 2. Fallback: Save to existing communication_logs table
    try {
      const { data, error } = await supabase
        .from("communication_logs")
        .insert({
          type: "SMS",
          direction: "OUTBOUND",
          subject: `Order SMS [${entry.type}]`,
          content: entry.message,
          status: entry.status,
          metadata: {
            order_id: entry.order_id,
            phone: entry.phone,
            provider: entry.provider,
            request_id: entry.request_id,
            response: entry.response,
            error_message: entry.error_message,
            sms_type: entry.type,
          },
        })
        .select("id")
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (commErr) {
      console.error("[Alpha SMS] Error recording to communication_logs:", commErr);
    }

    return null;
  }

  /**
   * Update orders table marking confirmation_sms_sent = true
   */
  private static async markOrderSmsSent(orderId: string) {
    const supabase = await createAdminClient();
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          confirmation_sms_sent: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        // If column does not exist yet, log silently
        console.warn("[Alpha SMS] Note on updating confirmation_sms_sent:", error.message);
      }
    } catch (err: any) {
      console.warn("[Alpha SMS] Exception updating confirmation_sms_sent:", err?.message);
    }
  }

  /**
   * Check if a prior SENT log exists for this order
   */
  private static async checkPriorSentLog(orderId: string): Promise<any | null> {
    const supabase = await createAdminClient();

    // Check sms_logs
    try {
      const { data } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("order_id", orderId)
        .eq("type", "ORDER_CONFIRMATION")
        .eq("status", "SENT")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) return data;
    } catch {
      // Ignored
    }

    // Check communication_logs
    try {
      const { data } = await supabase
        .from("communication_logs")
        .select("*")
        .filter("metadata->>order_id", "eq", orderId)
        .eq("type", "SMS")
        .eq("status", "SENT")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          order_id: orderId,
          phone: data.metadata?.phone || "",
          message: data.content || "",
          request_id: data.metadata?.request_id || "",
          status: "SENT",
        };
      }
    } catch {
      // Ignored
    }

    return null;
  }

  /**
   * Get all SMS logs for a given order (used by Admin Dashboard and API)
   */
  static async getOrderSmsLogs(orderId: string): Promise<SmsLog[]> {
    const supabase = await createAdminClient();
    const logs: SmsLog[] = [];

    // 1. Fetch from sms_logs
    try {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as SmsLog[];
      }
    } catch {
      // Fall through to communication_logs
    }

    // 2. Fetch from communication_logs fallback
    try {
      const { data, error } = await supabase
        .from("communication_logs")
        .select("*")
        .filter("metadata->>order_id", "eq", orderId)
        .eq("type", "SMS")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        for (const item of data) {
          logs.push({
            id: item.id,
            order_id: orderId,
            phone: item.metadata?.phone || "N/A",
            message: item.content || "",
            type: item.metadata?.sms_type || "ORDER_CONFIRMATION",
            status: item.status as any,
            provider: item.metadata?.provider || "ALPHA_SMS",
            request_id: item.metadata?.request_id || null,
            response: item.metadata?.response || null,
            error_message: item.metadata?.error_message || null,
            created_at: item.created_at,
            updated_at: item.created_at,
          });
        }
      }
    } catch {
      // Ignored
    }

    return logs;
  }
}
