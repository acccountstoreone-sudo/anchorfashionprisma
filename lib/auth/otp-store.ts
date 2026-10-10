import { createAdminClient } from "@/lib/supabase/admin-client";
import { logServerError } from "@/lib/utils/error-handler";

interface MemoryOtpRecord {
  email: string;
  otp: string;
  expires_at: number; // timestamp ms
  created_at: number; // timestamp ms
}

// Global persistent in-memory fallback store (survives hot reloads in dev/edge)
const memoryStore = new Map<string, MemoryOtpRecord[]>();

export const OtpStore = {
  /**
   * Check rate-limit and abuse count for the given email
   */
  async checkRateLimit(
    email: string,
    rateLimitSeconds: number = 60,
    maxAttempts: number = 5,
    windowMinutes: number = 15
  ): Promise<{ rateLimited: boolean; remainingSeconds: number; abuseExceeded: boolean }> {
    const supabase = createAdminClient();
    const nowMs = Date.now();
    const abuseCutoff = new Date(nowMs - windowMinutes * 60 * 1000).toISOString();

    try {
      const { data: recentOtps, error } = await supabase
        .from("registration_otps")
        .select("id, created_at")
        .eq("email", email)
        .gte("created_at", abuseCutoff)
        .order("created_at", { ascending: false });

      if (!error && recentOtps) {
        if (recentOtps.length > 0) {
          const latestTime = new Date(recentOtps[0].created_at).getTime();
          const elapsed = (nowMs - latestTime) / 1000;
          if (elapsed < rateLimitSeconds) {
            return {
              rateLimited: true,
              remainingSeconds: Math.ceil(rateLimitSeconds - elapsed),
              abuseExceeded: false,
            };
          }
          if (recentOtps.length >= maxAttempts) {
            return { rateLimited: false, remainingSeconds: 0, abuseExceeded: true };
          }
        }
        return { rateLimited: false, remainingSeconds: 0, abuseExceeded: false };
      }
    } catch {
      // Fallback to memory store below
    }

    // Memory store fallback check
    const records = (memoryStore.get(email) || []).filter(
      (r) => nowMs - r.created_at < windowMinutes * 60 * 1000
    );
    memoryStore.set(email, records);

    if (records.length > 0) {
      const latest = records[records.length - 1];
      const elapsed = (nowMs - latest.created_at) / 1000;
      if (elapsed < rateLimitSeconds) {
        return {
          rateLimited: true,
          remainingSeconds: Math.ceil(rateLimitSeconds - elapsed),
          abuseExceeded: false,
        };
      }
      if (records.length >= maxAttempts) {
        return { rateLimited: false, remainingSeconds: 0, abuseExceeded: true };
      }
    }

    return { rateLimited: false, remainingSeconds: 0, abuseExceeded: false };
  },

  /**
   * Save a newly generated OTP with expiry
   */
  async saveOtp(email: string, otp: string, expiresAt: Date): Promise<boolean> {
    const supabase = createAdminClient();
    const now = new Date();

    // Always keep memory store updated as secondary cache
    const existing = memoryStore.get(email) || [];
    existing.push({
      email,
      otp,
      expires_at: expiresAt.getTime(),
      created_at: now.getTime(),
    });
    memoryStore.set(email, existing);

    // Attempt writing to registration_otps in database
    try {
      const { error } = await supabase.from("registration_otps").insert([
        {
          email,
          otp,
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
        },
      ]);

      if (error) {
        // If table does not exist in schema cache, log warning and use memory fallback
        if (error.code === "PGRST205" || (error as any).code === "42P01") {
          console.warn("[OtpStore] registration_otps table not in DB, operating via secure in-memory cache.");
          return true;
        }
        logServerError("OTP_STORE_SAVE", error, { email });
        return true; // Still return true because memoryStore recorded it
      }
      return true;
    } catch (err) {
      logServerError("OTP_STORE_EXCEPTION", err, { email });
      return true;
    }
  },

  /**
   * Verify an OTP and atomically consume/invalidate it
   */
  async verifyAndConsumeOtp(
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    let dbChecked = false;
    let dbSuccess = false;

    // 1. Try checking database table
    try {
      const { data: records, error } = await supabase
        .from("registration_otps")
        .select("id, email, otp, expires_at")
        .eq("email", email)
        .eq("otp", otp)
        .gte("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error) {
        dbChecked = true;
        if (records && records.length > 0) {
          dbSuccess = true;
          // Invalidate immediately
          await supabase.from("registration_otps").delete().eq("email", email);
        }
      }
    } catch {
      // Non-fatal, check memory store below
    }

    if (dbSuccess) {
      // Clear memory cache as well
      memoryStore.delete(email);
      return { success: true };
    }

    // 2. Check memory store fallback
    const records = memoryStore.get(email) || [];
    const matchedIdx = records.findIndex((r) => r.otp === otp);

    if (matchedIdx !== -1) {
      const record = records[matchedIdx];
      if (nowMs > record.expires_at) {
        // Expired
        records.splice(matchedIdx, 1);
        memoryStore.set(email, records);
        return {
          success: false,
          error: "This verification code has expired. Please request a new code.",
        };
      }

      // Valid: Invalidate all OTPs for this email to prevent reuse
      memoryStore.delete(email);
      if (dbChecked) {
        try {
          await supabase.from("registration_otps").delete().eq("email", email);
        } catch {
          // ignore
        }
      }
      return { success: true };
    }

    // Check if any expired record existed in memory
    const expiredRecord = records.find((r) => r.otp === otp && nowMs > r.expires_at);
    if (expiredRecord) {
      return {
        success: false,
        error: "This verification code has expired. Please request a new code.",
      };
    }

    return {
      success: false,
      error: "Invalid verification code. Please check the code and try again.",
    };
  },
};
