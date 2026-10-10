import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LoyaltyRepository } from "@/repositories/loyalty.repository";
import { LoyaltyAccount, LoyaltyTransaction } from "@/types/customer.types";
import { WalletService } from "@/services/wallet.service";

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  reward_type: "DISCOUNT_VOUCHER" | "WALLET_CREDIT" | "FREE_SHIPPING" | "PHYSICAL_GIFT";
  reward_value: number;
  is_active: boolean;
  stock: number;
}

export class LoyaltyService {
  private static async getClient() {
    try {
      return await createAdminClient();
    } catch {
      return await createClient();
    }
  }

  static async getAccount(userId: string): Promise<LoyaltyAccount> {
    const existing = await LoyaltyRepository.getAccount(userId);
    if (existing) return existing;

    const supabase = await this.getClient();
    const { data: created, error } = await supabase
      .from("loyalty_accounts")
      .insert({
        customer_id: userId,
        tier: "SILVER",
        points_balance: 0,
        total_points_earned: 0,
        total_points_redeemed: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to auto-create loyalty account:", error);
      return {
        id: "",
        customer_id: userId,
        tier: "SILVER",
        points_balance: 0,
        total_points_earned: 0,
        total_points_redeemed: 0,
        tier_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return created;
  }

  static async getTransactions(accountId: string): Promise<LoyaltyTransaction[]> {
    return LoyaltyRepository.getTransactions(accountId);
  }

  static async getCatalog(): Promise<RewardCatalogItem[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("reward_catalog")
      .select("*")
      .eq("is_active", true)
      .order("points_cost", { ascending: true });
    
    if (error) {
      console.error("Failed to fetch reward catalog:", error);
      return [];
    }
    return data;
  }

  static async getSettings(): Promise<any> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "loyalty_rewards_settings")
      .single();
    
    if (error || !data) {
      return {
        points_per_currency: 1,
        currency_amount: 100,
        min_order_amount: 1000,
        signup_bonus: 50
      };
    }
    return data.value;
  }

  static async earnPoints(params: {
    userId: string;
    points: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<{ account: LoyaltyAccount; pointsEarned: number }> {
    if (params.points <= 0) {
      throw new Error("Points to earn must be greater than zero");
    }

    const account = await this.getAccount(params.userId);
    const supabase = await this.getClient();

    const isUuid = Boolean(
      params.referenceId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.referenceId)
    );

    const refId = isUuid ? params.referenceId : null;

    // Insert transaction. The DB partial unique constraint prevents double earning for the same referenceId and type.
    const { error: insertError } = await supabase.from("loyalty_transactions").insert({
      loyalty_account_id: account.id,
      type: "EARN",
      points: params.points,
      description: params.description || `Earned ${params.points} loyalty points`,
      reference_type: params.referenceType || "MANUAL",
      reference_id: refId,
    });

    if (insertError) {
      if (insertError.code === "23505") { // unique_violation
        console.warn(`Idempotency check: Points already earned for ${params.referenceType} ${refId}`);
        return { account, pointsEarned: 0 };
      }
      throw new Error(`Failed to insert loyalty transaction: ${insertError.message}`);
    }

    const newBalance = account.points_balance + params.points;
    const newTotalEarned = account.total_points_earned + params.points;

    let newTier: "SILVER" | "GOLD" | "PLATINUM" | "VIP" = "SILVER";
    if (newTotalEarned >= 10000) newTier = "VIP";
    else if (newTotalEarned >= 5000) newTier = "PLATINUM";
    else if (newTotalEarned >= 2000) newTier = "GOLD";

    const { data: updatedAccount, error: updateError } = await supabase
      .from("loyalty_accounts")
      .update({
        points_balance: newBalance,
        total_points_earned: newTotalEarned,
        tier: newTier,
        tier_updated_at: newTier !== account.tier ? new Date().toISOString() : account.tier_updated_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .select()
      .single();

    if (updateError || !updatedAccount) {
      throw new Error(`Failed to update loyalty balance: ${updateError?.message}`);
    }

    return { account: updatedAccount, pointsEarned: params.points };
  }

  static async reversePoints(params: {
    userId: string;
    referenceId: string;
    pointsToReverse: number;
    reason: string;
  }): Promise<{ success: boolean; pointsReversed: number; newBalance?: number; reason?: string }> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.rpc("reverse_loyalty_points", {
      p_customer_id: params.userId,
      p_reference_id: params.referenceId,
      p_points: params.pointsToReverse,
      p_reason: params.reason
    });

    if (error) {
      throw new Error(`Failed to reverse points: ${error.message}`);
    }

    const result = data as any;
    if (result.success && result.reversed) {
      return { success: true, pointsReversed: result.points_reversed };
    } else {
      return { success: false, pointsReversed: 0, reason: result.reason };
    }
  }

  static async redeemPoints(params: {
    userId: string;
    rewardId: string;
  }): Promise<{ success: boolean; voucherCode?: string; pointsDeducted?: number; newBalance?: number }> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.rpc("redeem_loyalty_points", {
      p_customer_id: params.userId,
      p_reward_id: params.rewardId
    });

    if (error) {
      throw new Error(`Redemption failed: ${error.message}`);
    }

    const result = data as any;
    return {
      success: result.success,
      voucherCode: result.voucher_code,
      pointsDeducted: result.points_deducted,
      newBalance: result.new_balance
    };
  }
}
