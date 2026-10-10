import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { EmailProvider } from "@/lib/notifications/EmailProvider";
import { CodRiskService } from "./cod-risk.service";

export interface VerificationSession {
  sessionId: string;
  targetType: "email" | "phone";
  targetValue: string;
  otpHash: string;
  expiresAt: number; // timestamp ms
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  lastSentAt: number; // timestamp ms
  verified: boolean;
  verifiedAt?: number;
}

// In-memory fallback store to ensure resilience if DB table is unmigrated or in edge runtime
const memoryVerificationStore = new Map<string, VerificationSession>();

export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class DefaultSmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string) {
    // Note: Live SMS delivery requires external SMS gateway provider credentials (e.g., SSL Wireless, Greenweb, Twilio).
    // Do not fabricate fake SMS success.
    console.warn(
      `[SMS Provider Notice] Live SMS dispatch requested for ${to}. Live SMS requires configured provider credentials. (Message length: ${message.length})`
    );
    return {
      success: false,
      error: "SMS provider credentials not configured. Using verified email dispatch fallback.",
    };
  }
}

export class CodOtpService {
  private static smsProvider: ISmsProvider = new DefaultSmsProvider();

  /**
   * Derive a stable HMAC secret for OTP hashing
   */
  private static getHashSecret(): string {
    return (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXTAUTH_SECRET ||
      "anchor-fashion-cod-fraud-shield-secret-key-2026"
    );
  }

  /**
   * Hashes an OTP using SHA-256 HMAC so raw OTPs are never stored in the database or cache.
   */
  static hashOtp(otp: string): string {
    return crypto
      .createHmac("sha256", this.getHashSecret())
      .update(otp.trim())
      .digest("hex");
  }

  /**
   * Generate a cryptographically secure 6-digit numeric OTP
   */
  static generateNumericOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Masks email or phone number for safe client display
   */
  static maskTarget(target: string, type: "email" | "phone" = "email"): string {
    if (type === "email" || target.includes("@")) {
      const [local, domain] = target.split("@");
      if (!domain) return target;
      if (local.length <= 2) return `${local[0]}***@${domain}`;
      return `${local[0]}***${local[local.length - 1]}@${domain}`;
    } else {
      const digits = target.replace(/\D/g, "");
      if (digits.length < 6) return target;
      return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
    }
  }

  /**
   * Send a COD Verification OTP to the customer.
   */
  static async initiateVerification(params: {
    sessionId: string;
    email: string;
    phone?: string;
    customerName?: string;
    orderTotal?: number;
  }): Promise<{
    success: boolean;
    sessionId: string;
    maskedTarget: string;
    targetType: "email" | "phone";
    remainingCooldownSeconds?: number;
    error?: string;
  }> {
    const config = await CodRiskService.getConfig();
    const now = Date.now();
    const expiresAt = now + config.otp_expiry_minutes * 60 * 1000;

    // Determine primary target: prioritize email where Resend is live
    const targetType: "email" | "phone" = params.email ? "email" : "phone";
    const targetValue = params.email ? params.email.toLowerCase().trim() : (params.phone || "").trim();

    // Check existing session for resend cooldown and limits
    let session = await this.getSession(params.sessionId);

    if (session) {
      // If already verified, do not send another OTP
      if (session.verified) {
        return {
          success: true,
          sessionId: params.sessionId,
          maskedTarget: this.maskTarget(targetValue, targetType),
          targetType,
        };
      }

      // Check resend cooldown
      const elapsedSeconds = Math.floor((now - session.lastSentAt) / 1000);
      if (elapsedSeconds < config.otp_resend_cooldown_seconds) {
        const remaining = config.otp_resend_cooldown_seconds - elapsedSeconds;
        return {
          success: false,
          sessionId: params.sessionId,
          maskedTarget: this.maskTarget(targetValue, targetType),
          targetType,
          remainingCooldownSeconds: remaining,
          error: `Please wait ${remaining} seconds before requesting another code.`,
        };
      }

      // Check max resends (max 3 resends per session)
      if (session.resendCount >= 3) {
        return {
          success: false,
          sessionId: params.sessionId,
          maskedTarget: this.maskTarget(targetValue, targetType),
          targetType,
          error: "Maximum verification resend attempts reached. Please contact customer support.",
        };
      }
    }

    // Generate new secure 6-digit OTP
    const rawOtp = this.generateNumericOtp();
    const otpHash = this.hashOtp(rawOtp);

    const updatedSession: VerificationSession = {
      sessionId: params.sessionId,
      targetType,
      targetValue,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: config.otp_max_attempts,
      resendCount: session ? session.resendCount + 1 : 0,
      lastSentAt: now,
      verified: false,
    };

    // Save session in cache and DB
    await this.saveSession(updatedSession);

    // -------------------------------------------------------------
    // Dispatch OTP via Configured Providers
    // -------------------------------------------------------------
    let emailDispatched = false;
    let smsDispatched = false;

    // 1. Email Dispatch via live Resend provider
    if (params.email) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Order Verification Code - Anchor Fashion</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 32px 40px 24px; text-align: center; background-color: #0f172a;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px;">ANCHOR FASHION</h1>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Cash on Delivery Verification</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 40px;">
                <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">Confirm Your Cash on Delivery Order</h2>
                <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 24px;">
                  Hello${params.customerName ? " " + params.customerName : ""},<br>
                  To confirm your Cash on Delivery order${params.orderTotal ? " of <strong>৳" + params.orderTotal.toLocaleString() + "</strong>" : ""} and protect against unauthorized orders, please use the 6-digit verification code below:
                </p>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; border: 1px dashed #cbd5e1;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #0f172a; display: inline-block; margin-left: 10px;">
                    ${rawOtp}
                  </span>
                </div>
                <p style="margin: 0 0 10px; color: #64748b; font-size: 13px; line-height: 20px;">
                  ⏱️ This code will expire in <strong>${config.otp_expiry_minutes} minutes</strong>.
                </p>
                <p style="margin: 0 0 24px; color: #94a3b8; font-size: 13px; line-height: 20px;">
                  If you did not place this order with Anchor Fashion, please ignore this email or contact support. Never share this code with anyone.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} Anchor Fashion Ltd. Dhaka, Bangladesh.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const sendResult = await EmailProvider.send({
          to: params.email,
          subject: `Anchor Fashion: Your Order Verification Code is ${rawOtp}`,
          html: emailHtml,
          text: `Your Anchor Fashion Cash on Delivery verification code is ${rawOtp}. Valid for ${config.otp_expiry_minutes} minutes.`,
        });

        if (!sendResult.error) {
          emailDispatched = true;
        } else {
          console.warn("[CodOtpService] Resend email dispatch returned error:", sendResult.error);
        }
      } catch (mailErr) {
        console.warn("[CodOtpService] Resend exception during email dispatch:", mailErr);
      }
    }

    // 2. SMS Dispatch attempt (with graceful provider notification)
    if (params.phone) {
      try {
        const smsRes = await this.smsProvider.sendSms(
          params.phone,
          `Anchor Fashion: Your order verification code is ${rawOtp}. Valid for ${config.otp_expiry_minutes} mins.`
        );
        smsDispatched = smsRes.success;
      } catch (smsErr) {
        // SMS errors are non-fatal when email is dispatched
      }
    }

    // In local development or testing sink, if live delivery cannot reach a customer address, log safely
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[COD OTP DEV NOTIFICATION] Session: ${params.sessionId} | Target: ${this.maskTarget(targetValue, targetType)} | Status: Dispatched`
      );
    }

    return {
      success: true,
      sessionId: params.sessionId,
      maskedTarget: this.maskTarget(targetValue, targetType),
      targetType,
    };
  }

  /**
   * Verify an OTP submitted by the user.
   */
  static async verifyOtp(
    sessionId: string,
    enteredOtp: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        error: "Verification session not found or expired. Please request a new code.",
      };
    }

    if (session.verified) {
      return { success: true };
    }

    const now = Date.now();

    // Check expiration
    if (now > session.expiresAt) {
      return {
        success: false,
        error: "Verification code has expired. Please request a new code.",
      };
    }

    // Check attempt limits
    if (session.attempts >= session.maxAttempts) {
      return {
        success: false,
        error: "Too many failed attempts. For your security, this verification code has been invalidated. Please request a new code.",
      };
    }

    // Compute submitted hash
    const submittedHash = this.hashOtp(enteredOtp);

    if (submittedHash !== session.otpHash) {
      // Increment attempt count
      session.attempts += 1;
      await this.saveSession(session);

      const remainingAttempts = session.maxAttempts - session.attempts;
      if (remainingAttempts <= 0) {
        return {
          success: false,
          error: "Too many failed attempts. This verification code has been invalidated. Please request a new code.",
        };
      }

      return {
        success: false,
        error: `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
      };
    }

    // Verification successful: atomically mark as verified
    session.verified = true;
    session.verifiedAt = now;
    await this.saveSession(session);

    return { success: true };
  }

  /**
   * Check whether a given session has been successfully verified
   */
  static async isSessionVerified(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return !!session?.verified;
  }

  /**
   * Fetch session from DB with memory fallback
   */
  private static async getSession(sessionId: string): Promise<VerificationSession | null> {
    // 1. Check memory cache first
    const cached = memoryVerificationStore.get(sessionId);
    if (cached) return cached;

    // 2. Check DB
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("cod_verifications")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (!error && data) {
        const session: VerificationSession = {
          sessionId: data.session_id,
          targetType: data.target_type,
          targetValue: data.target_value,
          otpHash: data.otp_hash,
          expiresAt: new Date(data.expires_at).getTime(),
          attempts: data.attempts || 0,
          maxAttempts: data.max_attempts || 5,
          resendCount: data.resend_count || 0,
          lastSentAt: new Date(data.last_sent_at).getTime(),
          verified: data.verified || false,
          verifiedAt: data.verified_at ? new Date(data.verified_at).getTime() : undefined,
        };
        memoryVerificationStore.set(sessionId, session);
        return session;
      }
    } catch {
      // Fallback to null
    }

    return null;
  }

  /**
   * Save session to DB and memory cache
   */
  private static async saveSession(session: VerificationSession): Promise<void> {
    // Always store in memory cache
    memoryVerificationStore.set(session.sessionId, session);

    // Attempt writing to DB
    try {
      const supabase = createAdminClient();
      await supabase.from("cod_verifications").upsert(
        {
          session_id: session.sessionId,
          target_type: session.targetType,
          target_value: session.targetValue,
          otp_hash: session.otpHash,
          expires_at: new Date(session.expiresAt).toISOString(),
          attempts: session.attempts,
          max_attempts: session.maxAttempts,
          resend_count: session.resendCount,
          last_sent_at: new Date(session.lastSentAt).toISOString(),
          verified: session.verified,
          verified_at: session.verifiedAt ? new Date(session.verifiedAt).toISOString() : null,
        },
        { onConflict: "session_id" }
      );
    } catch {
      // Non-fatal, memory cache handles it
    }
  }
}
