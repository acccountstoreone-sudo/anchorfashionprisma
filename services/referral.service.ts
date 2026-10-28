import { prisma } from "@/lib/prisma";
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
    const existing = await prisma.referral_codes.findFirst({
      where: { user_id: customerId, is_active: true },
    });

    if (existing) {
      return {
        id: existing.id,
        customer_id: existing.user_id,
        code: existing.code,
        is_active: existing.is_active ?? true,
      };
    }

    // Get user details to generate a readable code
    const profile = await prisma.profile.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true, email: true },
    });

    const baseName = profile?.firstName || profile?.email?.split("@")[0] || "USER";
    const newCode = this.generateUniqueCode(baseName);

    const created = await prisma.referral_codes.create({
      data: {
        user_id: customerId,
        code: newCode,
        is_active: true,
      },
    });

    return {
      id: created.id,
      customer_id: created.user_id,
      code: created.code,
      is_active: created.is_active ?? true,
    };
  }

  /**
   * Get referral code object by the string code.
   */
  static async getCodeByString(code: string): Promise<ReferralCode | null> {
    const record = await prisma.referral_codes.findFirst({
      where: {
        code: { equals: code.trim(), mode: "insensitive" },
        is_active: true,
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      customer_id: record.user_id,
      code: record.code,
      is_active: record.is_active ?? true,
    };
  }

  /**
   * Attributes a new customer signup to a referrer.
   * Called during the registration/OTP verification process.
   */
  static async attributeReferral(referralCodeStr: string, referredCustomerId: string): Promise<void> {
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
    const existing = await prisma.referral_attributions.findFirst({
      where: { referred_user_id: referredCustomerId },
    });

    if (existing) {
      console.warn(`Customer ${referredCustomerId} is already attributed to a referrer.`);
      return;
    }

    // Insert attribution
    try {
      await prisma.referral_attributions.create({
        data: {
          referrer_id: referralCode.customer_id,
          referred_user_id: referredCustomerId,
          referral_code: referralCode.code,
          status: "PENDING",
        },
      });
    } catch (err: any) {
      console.error(`Failed to attribute referral: ${err.message}`);
    }
  }

  /**
   * Qualifies a referral after the referred user completes a valid order.
   * Awards loyalty points to the referrer.
   */
  static async qualifyReferral(orderId: string): Promise<void> {
    // 1. Get the order to find the customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });

    const customerId = order?.customerId;
    if (!customerId) return;

    // 2. Check if this customer was referred and attribution is PENDING
    const attribution = await prisma.referral_attributions.findFirst({
      where: {
        referred_user_id: customerId,
        status: "PENDING",
      },
    });

    if (!attribution) return;

    // 3. Mark as REWARDED and issue points
    try {
      await prisma.referral_attributions.update({
        where: { id: attribution.id },
        data: {
          status: "REWARDED",
        },
      });

      const rewardPoints = 500;
      await LoyaltyService.earnPoints({
        userId: attribution.referrer_id,
        points: rewardPoints,
        description: `Referral reward for inviting a new customer`,
        referenceType: "REFERRAL",
        referenceId: attribution.id,
      });
    } catch (err) {
      console.error(`Error rewarding points for referral ${attribution.id}:`, err);
    }
  }

  /**
   * Reverses a referral reward if the qualifying order is cancelled or refunded.
   */
  static async reverseReferralReward(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });

    const customerId = order?.customerId;
    if (!customerId) return;

    // Find if there's a REWARDED attribution for this referred customer
    const attribution = await prisma.referral_attributions.findFirst({
      where: {
        referred_user_id: customerId,
        status: "REWARDED",
      },
    });

    if (!attribution) return;

    // Update status to REVERSED
    await prisma.referral_attributions.update({
      where: { id: attribution.id },
      data: { status: "REVERSED" },
    });

    // Deduct points from the referrer's loyalty account
    try {
      const account = await LoyaltyService.getAccount(attribution.referrer_id);
      if (account) {
        const rewardPoints = 500;
        const newBalance = Math.max(0, account.points_balance - rewardPoints);

        await prisma.$executeRawUnsafe(
          `UPDATE loyalty_accounts SET points_balance = $1 WHERE id = $2::uuid`,
          newBalance,
          account.id
        );

        await prisma.$executeRawUnsafe(
          `INSERT INTO loyalty_transactions (id, loyalty_account_id, type, points, description, reference_type, reference_id, created_at)
           VALUES (gen_random_uuid(), $1::uuid, 'REDEEM', $2, 'Referral reward reversed due to cancelled/refunded order', 'REFERRAL_REVERSAL', $3, NOW())`,
          account.id,
          rewardPoints,
          attribution.id
        );
      }
    } catch (err) {
      console.error("Failed to reverse referral points:", err);
    }
  }

  /**
   * Gets stats for the referral dashboard
   */
  static async getReferralStats(customerId: string) {
    const referralCode = await this.getOrCreateReferralCode(customerId);

    const attributions = await prisma.referral_attributions.findMany({
      where: { referrer_id: customerId },
      orderBy: { created_at: "desc" },
    });

    const pendingCount = attributions.filter((a) => a.status === "PENDING").length;
    const rewardedCount = attributions.filter((a) => a.status === "REWARDED").length;
    const totalEarned = rewardedCount * 500;

    return {
      referralCode: referralCode.code,
      stats: {
        totalInvited: attributions.length,
        pending: pendingCount,
        rewarded: rewardedCount,
        pointsEarned: totalEarned,
      },
      history: attributions.map((a) => ({
        id: a.id,
        status: a.status || "PENDING",
        attributed_at: a.created_at?.toISOString() || new Date().toISOString(),
      })),
    };
  }
}
