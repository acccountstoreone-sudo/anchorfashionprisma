import { describe, it, expect } from "vitest";

describe("Financial Calculations Engine", () => {
  // Helper for 2-decimal monetary rounding
  function roundCurrency(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  describe("Cart Subtotal Calculations", () => {
    it("should calculate correct subtotal across multiple line items and quantities", () => {
      const items = [
        { unit_price: 2950, quantity: 2 }, // 5900
        { unit_price: 6500, quantity: 1 }, // 6500
        { unit_price: 1650, quantity: 3 }, // 4950
      ];

      const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      expect(subtotal).toBe(17350);
    });

    it("should prioritize variant sale_price over base price when on discount", () => {
      const item = {
        base_price: 3500,
        sale_price: 2800,
        quantity: 2,
      };

      const effectivePrice = item.sale_price || item.base_price;
      const lineTotal = effectivePrice * item.quantity;
      expect(lineTotal).toBe(5600);
    });

    it("should return 0 subtotal for an empty cart", () => {
      const items: any[] = [];
      const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      expect(subtotal).toBe(0);
    });
  });

  describe("Delivery & Shipping Fee Calculations", () => {
    const SHIPPING_FEES: Record<string, number> = {
      home_delivery: 100, // Inside Dhaka
      home_delivery_outside: 150, // Outside Dhaka
    };

    function calculateShippingFee(method: string, subtotal: number): number {
      if (subtotal <= 0) return 0;
      return SHIPPING_FEES[method] ?? 100;
    }

    it("should apply Inside Dhaka delivery fee (100 BDT) for home_delivery", () => {
      const fee = calculateShippingFee("home_delivery", 2500);
      expect(fee).toBe(100);
    });

    it("should apply Outside Dhaka delivery fee (150 BDT) for home_delivery_outside", () => {
      const fee = calculateShippingFee("home_delivery_outside", 2500);
      expect(fee).toBe(150);
    });

    it("should default to 100 BDT when method is unspecified or standard", () => {
      const fee = calculateShippingFee("standard", 1500);
      expect(fee).toBe(100);
    });

    it("should charge 0 shipping when subtotal is 0", () => {
      const fee = calculateShippingFee("home_delivery", 0);
      expect(fee).toBe(0);
    });
  });

  describe("Tax / VAT Calculations", () => {
    const STANDARD_VAT_RATE = 0.15; // 15% standard VAT

    function calculateTax(subtotal: number, rate: number = STANDARD_VAT_RATE): number {
      return roundCurrency(subtotal * rate);
    }

    it("should calculate 15% standard tax accurately", () => {
      expect(calculateTax(1000)).toBe(150.0);
      expect(calculateTax(2500)).toBe(375.0);
      expect(calculateTax(3333.33)).toBe(500.0);
    });

    it("should return 0 tax on 0 subtotal", () => {
      expect(calculateTax(0)).toBe(0);
    });
  });

  describe("Coupon & Discount Calculation Logic", () => {
    interface Coupon {
      code: string;
      discount_type: "PERCENTAGE" | "FIXED";
      value: number;
      max_discount?: number;
      min_order_value?: number;
      is_active: boolean;
      valid_from: string;
      valid_until: string;
    }

    function calculateCouponDiscount(coupon: Coupon, subtotal: number): {
      isValid: boolean;
      discount: number;
      error?: string;
    } {
      if (!coupon.is_active) {
        return { isValid: false, discount: 0, error: "COUPON_INACTIVE" };
      }

      const now = new Date();
      if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_until)) {
        return { isValid: false, discount: 0, error: "COUPON_EXPIRED" };
      }

      if (coupon.min_order_value && subtotal < coupon.min_order_value) {
        return { isValid: false, discount: 0, error: "MINIMUM_ORDER_NOT_MET" };
      }

      let discountAmount = 0;
      if (coupon.discount_type === "PERCENTAGE") {
        discountAmount = (subtotal * coupon.value) / 100;
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount;
        }
      } else if (coupon.discount_type === "FIXED") {
        discountAmount = coupon.value;
      }

      // Discount cannot exceed subtotal
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }

      return {
        isValid: true,
        discount: roundCurrency(discountAmount),
      };
    }

    it("should calculate percentage discount correctly", () => {
      const coupon: Coupon = {
        code: "EID10",
        discount_type: "PERCENTAGE",
        value: 10,
        is_active: true,
        valid_from: "2020-01-01",
        valid_until: "2030-01-01",
      };

      const result = calculateCouponDiscount(coupon, 5000);
      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(500);
    });

    it("should enforce maximum discount cap on percentage coupons", () => {
      const coupon: Coupon = {
        code: "MEGA20",
        discount_type: "PERCENTAGE",
        value: 20, // 20% on 10,000 would be 2,000
        max_discount: 1000, // Capped at 1,000
        is_active: true,
        valid_from: "2020-01-01",
        valid_until: "2030-01-01",
      };

      const result = calculateCouponDiscount(coupon, 10000);
      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(1000);
    });

    it("should apply fixed amount discount", () => {
      const coupon: Coupon = {
        code: "SAVE300",
        discount_type: "FIXED",
        value: 300,
        is_active: true,
        valid_from: "2020-01-01",
        valid_until: "2030-01-01",
      };

      const result = calculateCouponDiscount(coupon, 2500);
      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(300);
    });

    it("should reject coupon when subtotal is below minimum order value", () => {
      const coupon: Coupon = {
        code: "VIP500",
        discount_type: "FIXED",
        value: 500,
        min_order_value: 3000,
        is_active: true,
        valid_from: "2020-01-01",
        valid_until: "2030-01-01",
      };

      const result = calculateCouponDiscount(coupon, 2000); // 2000 < 3000
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("MINIMUM_ORDER_NOT_MET");
      expect(result.discount).toBe(0);
    });

    it("should not allow discount to exceed order subtotal", () => {
      const coupon: Coupon = {
        code: "SPECIAL500",
        discount_type: "FIXED",
        value: 500,
        is_active: true,
        valid_from: "2020-01-01",
        valid_until: "2030-01-01",
      };

      const result = calculateCouponDiscount(coupon, 350); // Subtotal is only 350
      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(350); // Clamped to 350
    });

    it("should reject expired coupons", () => {
      const expiredCoupon: Coupon = {
        code: "EXPIRED2024",
        discount_type: "PERCENTAGE",
        value: 15,
        is_active: true,
        valid_from: "2023-01-01",
        valid_until: "2023-12-31", // in past
      };

      const result = calculateCouponDiscount(expiredCoupon, 5000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("COUPON_EXPIRED");
    });
  });

  describe("Grand Total & Net Payable Calculations", () => {
    function computeGrandTotal(params: {
      subtotal: number;
      shipping_fee: number;
      discount_amount: number;
      tax_amount?: number;
    }): number {
      const tax = params.tax_amount || 0;
      const raw = params.subtotal + params.shipping_fee + tax - params.discount_amount;
      return roundCurrency(Math.max(0, raw));
    }

    it("should compute exact grand total with subtotal, shipping, tax and discount", () => {
      const grandTotal = computeGrandTotal({
        subtotal: 5000,
        shipping_fee: 100,
        discount_amount: 500,
        tax_amount: 0,
      });
      // 5000 + 100 - 500 = 4600
      expect(grandTotal).toBe(4600);
    });

    it("should never produce a negative grand total even if discount exceeds", () => {
      const grandTotal = computeGrandTotal({
        subtotal: 200,
        shipping_fee: 100,
        discount_amount: 500,
      });
      // 200 + 100 - 500 = -200 -> clamped to 0
      expect(grandTotal).toBe(0);
    });

    it("should prevent floating point precision artifacts (0.1 + 0.2)", () => {
      const total = computeGrandTotal({
        subtotal: 70.1,
        shipping_fee: 29.2,
        discount_amount: 10.0,
      });
      // 70.1 + 29.2 = 99.3 - 10 = 89.3
      expect(total).toBe(89.3);
    });
  });

  describe("Profit Margins & Financial Analytics", () => {
    it("should compute gross profit and gross margin percentage correctly", () => {
      const revenue = 100000;
      const cogs = 60000; // Cost of Goods Sold
      const grossProfit = revenue - cogs;
      const grossMarginPercent = (grossProfit / revenue) * 100;

      expect(grossProfit).toBe(40000);
      expect(grossMarginPercent).toBe(40);
    });

    it("should compute net profit after operating expenses", () => {
      const grossProfit = 40000;
      const operatingExpenses = [
        { category: "Courier / Shipping Cost", amount: 8000 },
        { category: "Packaging", amount: 3500 },
        { category: "Warehouse Rent & Utilities", amount: 12000 },
      ];

      const totalExpenses = operatingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;
      const netMarginPercent = roundCurrency((netProfit / 100000) * 100);

      expect(totalExpenses).toBe(23500);
      expect(netProfit).toBe(16500);
      expect(netMarginPercent).toBe(16.5);
    });
  });

  describe("Cumulative Partial Refund & Transaction Status Engine", () => {
    interface RefundRecord {
      amount: number;
      status: "pending" | "processing" | "completed" | "failed" | "rejected";
    }

    function calculateRefundEligibility(
      transactionAmount: number,
      existingRefunds: RefundRecord[],
      requestedAmount: number
    ): {
      isEligible: boolean;
      priorRefundedAmount: number;
      remainingRefundable: number;
      newTxnStatus: "partially_refunded" | "refunded";
      error?: string;
    } {
      const priorRefundedAmount = existingRefunds
        .filter((r) => r.status === "completed" || r.status === "pending" || r.status === "processing")
        .reduce((sum, r) => sum + r.amount, 0);

      const remainingRefundable = Math.max(
        0,
        Math.round((transactionAmount - priorRefundedAmount) * 100) / 100
      );

      if (requestedAmount > remainingRefundable) {
        return {
          isEligible: false,
          priorRefundedAmount,
          remainingRefundable,
          newTxnStatus: "partially_refunded",
          error: `Refund amount (৳${requestedAmount}) exceeds remaining refundable balance (৳${remainingRefundable})`,
        };
      }

      const totalRefundedNow = Math.round((priorRefundedAmount + requestedAmount) * 100) / 100;
      const newTxnStatus =
        totalRefundedNow >= transactionAmount ? "refunded" : "partially_refunded";

      return {
        isEligible: true,
        priorRefundedAmount,
        remainingRefundable,
        newTxnStatus,
      };
    }

    it("should allow first partial refund and mark status as partially_refunded", () => {
      const result = calculateRefundEligibility(5000, [], 2000);
      expect(result.isEligible).toBe(true);
      expect(result.priorRefundedAmount).toBe(0);
      expect(result.remainingRefundable).toBe(5000);
      expect(result.newTxnStatus).toBe("partially_refunded");
    });

    it("should allow second partial refund and update remaining balance", () => {
      const existing: RefundRecord[] = [{ amount: 2000, status: "completed" }];
      const result = calculateRefundEligibility(5000, existing, 1500);
      expect(result.isEligible).toBe(true);
      expect(result.priorRefundedAmount).toBe(2000);
      expect(result.remainingRefundable).toBe(3000);
      expect(result.newTxnStatus).toBe("partially_refunded");
    });

    it("should mark status as refunded when final partial refund completes the full transaction amount", () => {
      const existing: RefundRecord[] = [
        { amount: 2000, status: "completed" },
        { amount: 1500, status: "completed" },
      ];
      // Remaining is 1500
      const result = calculateRefundEligibility(5000, existing, 1500);
      expect(result.isEligible).toBe(true);
      expect(result.remainingRefundable).toBe(1500);
      expect(result.newTxnStatus).toBe("refunded");
    });

    it("should reject refund request that exceeds cumulative remaining balance", () => {
      const existing: RefundRecord[] = [
        { amount: 3000, status: "completed" },
        { amount: 1000, status: "pending" },
      ];
      // Prior refunded = 4000, remaining = 1000
      const result = calculateRefundEligibility(5000, existing, 1500);
      expect(result.isEligible).toBe(false);
      expect(result.remainingRefundable).toBe(1000);
      expect(result.error).toContain("exceeds remaining refundable balance (৳1000)");
    });

    it("should ignore failed or rejected refunds when computing cumulative prior refunded amount", () => {
      const existing: RefundRecord[] = [
        { amount: 2000, status: "completed" },
        { amount: 1500, status: "failed" },
        { amount: 500, status: "rejected" },
      ];
      const result = calculateRefundEligibility(5000, existing, 3000);
      expect(result.isEligible).toBe(true);
      expect(result.priorRefundedAmount).toBe(2000);
      expect(result.remainingRefundable).toBe(3000);
      expect(result.newTxnStatus).toBe("refunded");
    });
  });

  describe("Shipping Charge Calculation Engine with Weight & COD", () => {
    function calculateShipping(params: {
      baseRate: number;
      perKgRate: number;
      weightKg: number;
      codCharge: number;
      isCOD: boolean;
      freeShippingThreshold?: number | null;
      orderValue: number;
    }) {
      if (params.freeShippingThreshold && params.orderValue >= params.freeShippingThreshold) {
        const cod = params.isCOD ? Math.round(params.codCharge * 100) / 100 : 0;
        return {
          baseRate: 0,
          weightCharge: 0,
          codCharge: cod,
          total: cod,
          isFreeShipping: true,
        };
      }

      const baseRate = Math.round(params.baseRate * 100) / 100;
      const weightCharge = Math.round(params.weightKg * params.perKgRate * 100) / 100;
      const codCharge = params.isCOD ? Math.round(params.codCharge * 100) / 100 : 0;
      const total = Math.round((baseRate + weightCharge + codCharge) * 100) / 100;

      return {
        baseRate,
        weightCharge,
        codCharge,
        total,
        isFreeShipping: false,
      };
    }

    it("should calculate exact shipping fee for base rate with fractional weight and COD", () => {
      const result = calculateShipping({
        baseRate: 60,
        perKgRate: 20,
        weightKg: 2.35,
        codCharge: 10,
        isCOD: true,
        orderValue: 1500,
      });

      // base: 60, weight: 2.35 * 20 = 47, cod: 10 -> total: 117
      expect(result.baseRate).toBe(60);
      expect(result.weightCharge).toBe(47);
      expect(result.codCharge).toBe(10);
      expect(result.total).toBe(117);
      expect(result.isFreeShipping).toBe(false);
    });

    it("should waive base rate and weight charge when order value meets free shipping threshold", () => {
      const result = calculateShipping({
        baseRate: 60,
        perKgRate: 20,
        weightKg: 3.5,
        codCharge: 15,
        isCOD: true,
        freeShippingThreshold: 3000,
        orderValue: 3500,
      });

      expect(result.isFreeShipping).toBe(true);
      expect(result.baseRate).toBe(0);
      expect(result.weightCharge).toBe(0);
      expect(result.codCharge).toBe(15);
      expect(result.total).toBe(15);
    });
  });
});

