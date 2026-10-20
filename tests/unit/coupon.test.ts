import { describe, it, expect, vi } from "vitest";
import { CouponService } from "@/services/coupon.service";

describe("Coupon System & Validation Engine", () => {
  describe("validateAndCalculateDiscount", () => {
    it("should validate and calculate percentage discount correctly", async () => {
      const res = await CouponService.validateAndCalculateDiscount("ANCHOR10", 2000);
      expect(res.isValid).toBe(true);
      expect(res.discount).toBe(200); // 10% of 2000
      expect(res.coupon?.code).toBe("ANCHOR10");
      expect(res.coupon?.discount_type).toBe("PERCENTAGE");
    });

    it("should cap percentage discount at max_discount", async () => {
      // ANCHOR10 max discount is 500
      const res = await CouponService.validateAndCalculateDiscount("ANCHOR10", 10000);
      expect(res.isValid).toBe(true);
      expect(res.discount).toBe(500); // 10% of 10000 is 1000, capped at 500
    });

    it("should validate fixed amount discount correctly", async () => {
      const res = await CouponService.validateAndCalculateDiscount("FIRSTBUY", 2500);
      expect(res.isValid).toBe(true);
      expect(res.discount).toBe(300); // Flat 300 BDT
      expect(res.coupon?.code).toBe("FIRSTBUY");
      expect(res.coupon?.discount_type).toBe("FIXED");
    });

    it("should reject coupon when minimum order requirement is not met", async () => {
      // FIRSTBUY requires min order of 2000
      const res = await CouponService.validateAndCalculateDiscount("FIRSTBUY", 1200);
      expect(res.isValid).toBe(false);
      expect(res.discount).toBe(0);
      expect(res.error).toContain("Minimum order amount of ৳2,000 required");
    });

    it("should reject invalid or non-existent coupon codes", async () => {
      const res = await CouponService.validateAndCalculateDiscount("INVALID_XYZ_999", 5000);
      expect(res.isValid).toBe(false);
      expect(res.discount).toBe(0);
      expect(res.error).toBe("Coupon code not found or invalid");
    });

    it("should reject empty coupon code input", async () => {
      const res = await CouponService.validateAndCalculateDiscount("", 5000);
      expect(res.isValid).toBe(false);
      expect(res.discount).toBe(0);
      expect(res.error).toBe("Please enter a valid coupon code");
    });

    it("should ensure discount does not exceed subtotal", async () => {
      // If a flat 500 coupon is applied to a 350 cart (hypothetical edge case)
      const res = await CouponService.validateAndCalculateDiscount("VIPCLUB", 4000);
      expect(res.isValid).toBe(true);
      expect(res.discount).toBeLessThanOrEqual(4000);
    });

    it("should be case-insensitive for coupon codes", async () => {
      const lowercase = await CouponService.validateAndCalculateDiscount("anchor10", 2000);
      expect(lowercase.isValid).toBe(true);
      expect(lowercase.discount).toBe(200);

      const mixedCase = await CouponService.validateAndCalculateDiscount("FiRsTbUy", 3000);
      expect(mixedCase.isValid).toBe(true);
      expect(mixedCase.discount).toBe(300);
    });
  });
});
