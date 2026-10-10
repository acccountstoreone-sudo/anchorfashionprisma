import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LoyaltyService } from "./loyalty.service";
import crypto from "crypto";

export interface ReferralCode {
  id: string;
  customer_id: string;
  code: string;
  is_active: boolean;
}

export interface ReferralAttribution {
  id: string;
  referrer_customer_id: string;
  referred_customer_id: string;
  referral_code_id: string;
  status: "PENDING" | "QUALIFIED" | "REWARDED" | "REVERSED" | "ABUSE_FLAGGED";
  reward_transaction_id?: string;
  attributed_at: string;
  qualified_at?: string;
  rewarded_at?: string;
}

export class ReferralService {
  private static async getAdminClient() {
    return await createAdminClient();
  }

  /**
   * Generates a unique, stable alphanumeric referral code for a customer.
   */
  private static generateUniqueCode(baseStr: string): string {
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const cleanBase = baseStr.replace(/[^A-Za-z0-9]/g, "").substring(0, 5).toUpperCase();
    return `${cleanBase || "AF"}${randomSuffix}`;
  }

  /**
   * Gets or creates a referral code for a given customer.
   */
  static async getOrCreateReferralCode(customerId: string): Promise<ReferralCode> {
    const supabase = await this.getAdminClient();

    // Check if one already exists
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("customer_id", customerId)
      .single();

    if (existing) return existing;

    // Get user details to generate a nice code
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", customerId)
      .single();

    const baseName = profile?.first_name || profile?.email?.split("@")[0] || "USER";
    const newCode = this.generateUniqueCode(baseName);

    // Insert new code
    const { data: created, error } = await supabase
      .from("referral_codes")
      .insert({
        customer_id: customerId,
        code: newCode,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create referral code: ${error.message}`);
    }

    return created;
  }

  /**
   * Get referral code object by the string code.
   */
  static async getCodeByString(code: string): Promise<ReferralCode | null> {
    const supabase = await this.getAdminClient();
    const { data } = await supabase
      .from("referral_codes")
      .select("*")
      .ilike("code", code)
      .eq("is_active", true)
      .single();
    
    return data || null;
  }

  /**
   * Attributes a new customer signup to a referrer.
   * Called during the registration/OTP verification process.
   */
  static async attributeReferral(referralCodeStr: string, referredCustomerId: string): Promise<void> {
    const supabase = await this.getAdminClient();
    
    const referralCode = await this.getCodeByString(referralCodeStr);
    if (!referralCode) {
      console.warn(`Referral code not found or inactive: ${referralCodeStr}`);
      return;
    }

    // Prevent self-referral
    if (referralCode.customer_id === referredCustomerId) {
      console.warn(`Self-referral attempted by customer: ${referredCustomerId}`);
      return;
    }

    // Check for existing attribution to prevent duplicates
    const { data: existingAttribution } = await supabase
      .from("referral_attributions")
      .select("id")
      .eq("referred_customer_id", referredCustomerId)
      .single();

    if (existingAttribution) {
      console.warn(`Customer ${referredCustomerId} is already attributed to a referrer.`);
      return;
    }

    // Insert attribution
    const { error } = await supabase
      .from("referral_attributions")
      .insert({
        referrer_customer_id: referralCode.customer_id,
        referred_customer_id: referredCustomerId,
        referral_code_id: referralCode.id,
        status: "PENDING"
      });

    if (error) {
      console.error(`Failed to attribute referral: ${error.message}`);
    }
  }

  /**
   * Qualifies a referral after the referred user completes a valid order.
   * Awards loyalty points to the referrer.
   */
  static async qualifyReferral(orderId: string): Promise<void> {
    const supabase = await this.getAdminClient();

    // 1. Get the order to find the customer
    const { data: order } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("id", orderId)
      .single();

    if (!order) return;

    // 2. Check if this customer was referred and attribution is PENDING
    const { data: attribution } = await supabase
      .from("referral_attributions")
      .select("*")
      .eq("referred_customer_id", order.customer_id)
      .eq("status", "PENDING")
      .single();

    if (!attribution) return; // Not a referred customer or already processed

    // 3. Mark as QUALIFIED/REWARDED and issue points
    // (using Optimistic Concurrency to prevent duplicate rewards)
    const { data: updatedAttribution, error: updateError } = await supabase
      .from("referral_attributions")
      .update({
        status: "REWARDED",
        qualified_at: new Date().toISOString(),
        rewarded_at: new Date().toISOString()
      })
      .eq("id", attribution.id)
      .eq("status", "PENDING")
      .select()
      .single();

    if (updateError || !updatedAttribution) {
      console.warn(`Failed to update attribution status for ${attribution.id}. Maybe already rewarded.`);
      return;
    }

    // 4. Award points to the referrer
    try {
      const rewardPoints = 500; // Define business logic points here
      
      const { pointsEarned } = await LoyaltyService.earnPoints({
        userId: attribution.referrer_customer_id,
        points: rewardPoints,
        description: `Referral reward for inviting a new customer`,
        referenceType: "REFERRAL",
        referenceId: attribution.id // Idempotent reference
      });

      console.log(`Successfully rewarded referrer ${attribution.referrer_customer_id} with ${pointsEarned} points.`);
    } catch (err) {
      console.error(`Error rewarding points for referral ${attribution.id}:`, err);
      // Rollback status if point issuance fails
      await supabase
        .from("referral_attributions")
        .update({ status: "PENDING", qualified_at: null, rewarded_at: null })
        .eq("id", attribution.id);
    }
  }

  /**
   * Reverses a referral reward if the qualifying order is cancelled or refunded.
   */
  static async reverseReferralReward(orderId: string): Promise<void> {
    const supabase = await this.getAdminClient();

    const { data: order } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("id", orderId)
      .single();

    if (!order) return;

    // Find if there's a REWARDED attribution for this referred customer
    const { data: attribution } = await supabase
      .from("referral_attributions")
      .select("*")
      .eq("referred_customer_id", order.customer_id)
      .eq("status", "REWARDED")
      .single();

    if (!attribution) return;

    // Update status to REVERSED
    const { data: updated, error } = await supabase
      .from("referral_attributions")
      .update({ status: "REVERSED" })
      .eq("id", attribution.id)
      .eq("status", "REWARDED")
      .select()
      .single();

    if (error || !updated) return;

    // We must manually deduct points from the referrer's loyalty account
    try {
      // Find the earn transaction to know how many points to reverse
      const { data: txn } = await supabase
        .from("loyalty_transactions")
        .select("points")
        .eq("reference_type", "REFERRAL")
        .eq("reference_id", attribution.id)
        .single();
        
      if (txn) {
        // We'll create a manual debit
        const account = await LoyaltyService.getAccount(attribution.referrer_customer_id);
        const newBalance = Math.max(0, account.points_balance - txn.points);
        
        await supabase
          .from("loyalty_accounts")
          .update({ points_balance: newBalance })
          .eq("id", account.id);
          
        await supabase.from("loyalty_transactions").insert({
          loyalty_account_id: account.id,
          type: "REDEEM", // Use REDEEM or a specific ADJ_DEBIT type
          points: txn.points,
          description: "Referral reward reversed due to cancelled/refunded order",
          reference_type: "REFERRAL_REVERSAL",
          reference_id: attribution.id
        });
      }
    } catch (err) {
      console.error("Failed to reverse referral points:", err);
    }
  }

  /**
   * Gets stats for the referral dashboard
   */
  static async getReferralStats(customerId: string) {
    const supabase = await this.getAdminClient();
    
    const referralCode = await this.getOrCreateReferralCode(customerId);
    
    const { data: attributions, error } = await supabase
      .from("referral_attributions")
      .select(`
        id,
        status,
        attributed_at,
        referred:profiles!referral_attributions_referred_customer_id_fkey(first_name, last_name, email)
      `)
      .eq("referrer_customer_id", customerId)
      .order("attributed_at", { ascending: false });
      
    if (error) {
      console.error("Failed to fetch referral stats:", error);
    }

    const pendingCount = attributions?.filter(a => a.status === "PENDING").length || 0;
    const rewardedCount = attributions?.filter(a => a.status === "REWARDED").length || 0;
    const totalEarned = rewardedCount * 500; // Hardcoded point rule match

    return {
      referralCode: referralCode.code,
      stats: {
        totalInvited: attributions?.length || 0,
        pending: pendingCount,
        rewarded: rewardedCount,
        pointsEarned: totalEarned
      },
      history: attributions || []
    };
  }
}
