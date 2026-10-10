import { prisma } from "@/lib/prisma";

export interface CouponRecord {
  id: string;
  code: string;
  discount_type: "PERCENTAGE" | "FIXED";
  value: number;
  min_order_value?: number | null;
  max_discount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCouponInput {
  code: string;
  discount_type: "PERCENTAGE" | "FIXED";
  value: number;
  min_order_value?: number | null;
  max_discount?: number | null;
  usage_limit?: number | null;
  valid_from: string;
  valid_until: string;
  is_active?: boolean;
}

export class CouponRepository {
  static async getCoupons(): Promise<CouponRecord[]> {
    try {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
      });

      return coupons.map((row) => ({
        id: row.id,
        code: row.code,
        discount_type: row.discountType as "PERCENTAGE" | "FIXED",
        value: Number(row.discountValue),
        min_order_value: row.minOrderAmount ? Number(row.minOrderAmount) : null,
        max_discount: row.maxDiscount ? Number(row.maxDiscount) : null,
        usage_limit: row.usageLimit,
        used_count: row.usedCount,
        valid_from: row.startDate?.toISOString() || row.createdAt.toISOString(),
        valid_until: row.endDate?.toISOString() || row.createdAt.toISOString(),
        is_active: row.isActive,
        created_at: row.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error("Unexpected error in getCoupons:", err);
      return [];
    }
  }

  static async createCoupon(input: CreateCouponInput): Promise<CouponRecord> {
    const data = await prisma.coupon.create({
      data: {
        code: input.code.trim().toUpperCase(),
        discountType: input.discount_type,
        discountValue: input.value,
        minOrderAmount: input.min_order_value,
        maxDiscount: input.max_discount,
        usageLimit: input.usage_limit,
        usedCount: 0,
        startDate: new Date(input.valid_from),
        endDate: new Date(input.valid_until),
        isActive: input.is_active ?? true,
      },
    });

    return {
      id: data.id,
      code: data.code,
      discount_type: data.discountType as "PERCENTAGE" | "FIXED",
      value: Number(data.discountValue),
      min_order_value: data.minOrderAmount ? Number(data.minOrderAmount) : null,
      max_discount: data.maxDiscount ? Number(data.maxDiscount) : null,
      usage_limit: data.usageLimit,
      used_count: data.usedCount,
      valid_from: data.startDate?.toISOString() || data.createdAt.toISOString(),
      valid_until: data.endDate?.toISOString() || data.createdAt.toISOString(),
      is_active: data.isActive,
      created_at: data.createdAt.toISOString(),
    };
  }

  static async toggleCouponStatus(
    id: string,
    is_active: boolean
  ): Promise<CouponRecord> {
    const data = await prisma.coupon.update({
      where: { id },
      data: { isActive: is_active },
    });

    return {
      id: data.id,
      code: data.code,
      discount_type: data.discountType as "PERCENTAGE" | "FIXED",
      value: Number(data.discountValue),
      min_order_value: data.minOrderAmount ? Number(data.minOrderAmount) : null,
      max_discount: data.maxDiscount ? Number(data.maxDiscount) : null,
      usage_limit: data.usageLimit,
      used_count: data.usedCount,
      valid_from: data.startDate?.toISOString() || data.createdAt.toISOString(),
      valid_until: data.endDate?.toISOString() || data.createdAt.toISOString(),
      is_active: data.isActive,
      created_at: data.createdAt.toISOString(),
    };
  }

  static async deleteCoupon(id: string): Promise<void> {
    await prisma.coupon.delete({ where: { id } });
  }
}
