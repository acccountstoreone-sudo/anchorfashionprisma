import { createAdminClient } from "@/lib/supabase/admin-client";
import { CouponRecord } from "@/lib/repositories/marketing/coupon.repository";

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: CouponRecord;
  discount: number;
  error?: string;
}

export class CouponService {
  private static getAdminClient() {
    return createAdminClient();
  }

  /**
   * Validates a coupon and calculates the discount for the given subtotal.
   * Does NOT consume the coupon.
   */
  static async validateAndCalculateDiscount(
    code: string,
    subtotal: number,
    customerId?: string
  ): Promise<CouponValidationResult> {
    try {
      if (!code || !code.trim()) {
        return { isValid: false, discount: 0, error: "Empty coupon code" };
      }

      const supabase = this.getAdminClient();
      
      // 1. Fetch Coupon
      const { data: couponData, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .ilike("code", code.trim())
        .single();

      if (couponError || !couponData) {
        return { isValid: false, discount: 0, error: "INVALID_COUPON" };
      }

      const coupon = couponData as CouponRecord;

      // 2. Validate Active State & Expiry
      if (!coupon.is_active) {
        return { isValid: false, discount: 0, error: "COUPON_INACTIVE" };
      }

      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom || now > validUntil) {
        return { isValid: false, discount: 0, error: "COUPON_EXPIRED" };
      }

      // 3. Validate Minimum Order Value
      if (coupon.min_order_value && subtotal < coupon.min_order_value) {
        return { isValid: false, discount: 0, error: `MINIMUM_ORDER_NOT_MET` };
      }

      // 4. Validate Global Usage Limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return { isValid: false, discount: 0, error: "COUPON_USAGE_LIMIT_REACHED" };
      }

      // 5. Validate Per-User Limit
      const perUserLimit = couponData.per_user_limit || 1;
      if (customerId && perUserLimit) {
        const { count, error: usageError } = await supabase
          .from("coupon_usages")
          .select("*", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("customer_id", customerId);

        if (usageError) {
          console.error("Error checking customer usage:", usageError);
        } else if (count !== null && count >= perUserLimit) {
          return { isValid: false, discount: 0, error: "CUSTOMER_USAGE_LIMIT_REACHED" };
        }
      }

      // 6. Calculate Discount
      let discountAmount = 0;
      if (coupon.discount_type === "PERCENTAGE") {
        discountAmount = (subtotal * coupon.value) / 100;
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount;
        }
      } else if (coupon.discount_type === "FIXED") {
        discountAmount = coupon.value;
      }

      // 7. Ensure discount doesn't exceed subtotal
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }

      // Avoid floating point precision issues
      discountAmount = Math.round(discountAmount * 100) / 100;

      return {
        isValid: true,
        coupon,
        discount: discountAmount,
      };

    } catch (err) {
      console.error("Error validating coupon:", err);
      return { isValid: false, discount: 0, error: "INTERNAL_ERROR" };
    }
  }

  /**
   * Atomically consumes a coupon using the `consume_coupon_atomic` RPC.
   */
  static async consumeCoupon(
    code: string,
    customerId: string | undefined,
    orderId: string,
    discountApplied: number
  ): Promise<boolean> {
    try {
      const supabase = this.getAdminClient();
      
      const { data, error } = await supabase.rpc("consume_coupon_atomic", {
        p_coupon_code: code.trim(),
        p_customer_id: customerId || null,
        p_order_id: orderId,
        p_discount_applied: discountApplied
      });

      if (error) {
        console.error("Error consuming coupon atomically:", error);
        throw new Error(error.message || "Failed to consume coupon");
      }

      return true;
    } catch (err: any) {
      console.error("Failed to consume coupon:", err);
      throw new Error(err.message || "Failed to consume coupon");
    }
  }

  /**
   * Atomically releases a coupon using the `release_coupon_atomic` RPC.
   */
  static async releaseCoupon(orderId: string): Promise<boolean> {
    try {
      const supabase = this.getAdminClient();
      
      const { error } = await supabase.rpc("release_coupon_atomic", {
        p_order_id: orderId
      });

      return true;
    } catch (err: any) {
      console.error("Failed to release coupon:", err);
      return false; // don't throw, since this is used in cleanup
    }
  }

  /**
   * Validates an advanced Promo Rule
   */
  static async validatePromoRule(
    code: string,
    subtotal: number,
    cartItems: any[]
  ) {
    const supabase = this.getAdminClient();
    const { data: promo, error } = await supabase
      .from("promo_rules")
      .select("*")
      .ilike("code", code.trim())
      .single();

    if (error || !promo) return { isValid: false, discount: 0, error: "INVALID_PROMO" };
    if (!promo.is_active) return { isValid: false, discount: 0, error: "PROMO_INACTIVE" };
    
    const now = new Date();
    if (now < new Date(promo.start_date) || (promo.end_date && now > new Date(promo.end_date))) {
      return { isValid: false, discount: 0, error: "PROMO_EXPIRED" };
    }

    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return { isValid: false, discount: 0, error: "PROMO_LIMIT_REACHED" };
    }

    const conditions = promo.conditions || {};
    
    // Check Cart Threshold
    if (conditions.min_cart_value && subtotal < conditions.min_cart_value) {
      return { isValid: false, discount: 0, error: "MIN_CART_VALUE_NOT_MET" };
    }

    let discountAmount = 0;
    if (promo.discount_type === "PERCENTAGE") {
      discountAmount = (subtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === "FIXED") {
      discountAmount = promo.discount_value;
    }

    if (discountAmount > subtotal) discountAmount = subtotal;

    return { isValid: true, promo, discount: Math.round(discountAmount * 100) / 100 };
  }
}
