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
        return { isValid: false, discount: 0, error: "Please enter a valid coupon code" };
      }

      const supabase = this.getAdminClient();
      
      // 1. Fetch Coupon
      const { data: couponData, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .ilike("code", code.trim())
        .single();

      if (couponError || !couponData) {
        return { isValid: false, discount: 0, error: "Coupon code not found or invalid" };
      }

      // Extract unified properties supporting both snake_case DB columns and camelCase/alternate aliases
      const isActive = couponData.is_active ?? couponData.isActive ?? true;
      const discountType = (couponData.discount_type || couponData.discountType || "PERCENTAGE").toUpperCase();
      const discountValue = Number(couponData.discount_value ?? couponData.value ?? couponData.discountValue ?? 0);
      const minOrderAmount = couponData.min_order_amount ?? couponData.min_order_value ?? couponData.minOrderAmount ?? null;
      const maxDiscount = couponData.max_discount ?? couponData.maxDiscount ?? null;
      const usageLimit = couponData.usage_limit ?? couponData.usageLimit ?? null;
      const usedCount = Number(couponData.used_count ?? couponData.usedCount ?? 0);
      const startDate = couponData.start_date ?? couponData.valid_from ?? couponData.startDate ?? null;
      const endDate = couponData.end_date ?? couponData.valid_until ?? couponData.endDate ?? null;

      // 2. Validate Active State & Expiry
      if (!isActive) {
        return { isValid: false, discount: 0, error: "This coupon is currently inactive" };
      }

      const now = new Date();
      if (startDate) {
        const validFrom = new Date(startDate);
        if (!isNaN(validFrom.getTime()) && now < validFrom) {
          return { isValid: false, discount: 0, error: "This coupon is not active yet" };
        }
      }

      if (endDate) {
        const validUntil = new Date(endDate);
        if (!isNaN(validUntil.getTime()) && now > validUntil) {
          return { isValid: false, discount: 0, error: "This coupon has expired" };
        }
      }

      // 3. Validate Minimum Order Value
      if (minOrderAmount !== null && minOrderAmount !== undefined) {
        const minVal = Number(minOrderAmount);
        if (subtotal < minVal) {
          return {
            isValid: false,
            discount: 0,
            error: `Minimum order amount of ৳${minVal.toLocaleString()} required for this coupon`,
          };
        }
      }

      // 4. Validate Global Usage Limit
      if (usageLimit !== null && usageLimit !== undefined && usageLimit > 0) {
        if (usedCount >= usageLimit) {
          return { isValid: false, discount: 0, error: "Coupon usage limit has been reached" };
        }
      }

      // 5. Validate Per-User Limit
      const perUserLimit = couponData.per_user_limit || 1;
      if (customerId && perUserLimit) {
        const { count, error: usageError } = await supabase
          .from("coupon_usages")
          .select("*", { count: "exact", head: true })
          .eq("coupon_id", couponData.id)
          .eq("customer_id", customerId);

        if (usageError) {
          console.error("Error checking customer usage:", usageError);
        } else if (count !== null && count >= perUserLimit) {
          return { isValid: false, discount: 0, error: "You have already used this coupon" };
        }
      }

      // 6. Calculate Discount
      let discountAmount = 0;
      if (discountType === "PERCENTAGE") {
        discountAmount = (subtotal * discountValue) / 100;
        if (maxDiscount !== null && maxDiscount !== undefined) {
          const maxVal = Number(maxDiscount);
          if (discountAmount > maxVal) {
            discountAmount = maxVal;
          }
        }
      } else if (discountType === "FIXED") {
        discountAmount = discountValue;
      }

      // 7. Ensure discount doesn't exceed subtotal
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }

      // Avoid floating point precision issues
      discountAmount = Math.round(discountAmount * 100) / 100;

      const normalizedCoupon: CouponRecord = {
        id: couponData.id,
        code: couponData.code,
        discount_type: discountType as "PERCENTAGE" | "FIXED",
        value: discountValue,
        min_order_value: minOrderAmount ? Number(minOrderAmount) : null,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: usageLimit,
        used_count: usedCount,
        valid_from: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        valid_until: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 365 * 86400000).toISOString(),
        is_active: isActive,
        created_at: couponData.created_at || couponData.createdAt || new Date().toISOString(),
      };

      return {
        isValid: true,
        coupon: normalizedCoupon,
        discount: discountAmount,
      };

    } catch (err) {
      console.error("Error validating coupon:", err);
      return { isValid: false, discount: 0, error: "Internal error validating coupon" };
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
