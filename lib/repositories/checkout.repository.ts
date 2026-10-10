import { prisma } from "@/lib/prisma";
import { CheckoutSession, CheckoutStep } from "@/types/checkout.types";
import { AddressFormValues } from "@/schemas/checkout.schema";

function mapToCheckoutSession(record: any): CheckoutSession {
  return {
    id: record.id,
    user_id: record.userId,
    guest_email: record.guestEmail,
    cart_id: record.cartId,
    current_step: record.currentStep as CheckoutStep,
    shipping_address_snapshot: (record.shippingAddressSnapshot as AddressFormValues) || null,
    billing_address_snapshot: (record.billingAddressSnapshot as AddressFormValues) || null,
    shipping_method: record.shippingMethod || null,
    payment_method: record.paymentMethod || null,
    coupon_code: record.couponCode || null,
    expires_at: record.expiresAt ? new Date(record.expiresAt).toISOString() : new Date().toISOString(),
    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
    updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export class CheckoutRepository {
  /**
   * Get a checkout session by User ID or Guest Email (with Cart ID)
   */
  static async getSession(
    cartId: string,
    userId?: string | null
  ): Promise<CheckoutSession | null> {
    try {
      const record = await prisma.checkoutSession.findFirst({
        where: {
          cartId,
          ...(userId ? { userId } : { userId: null }),
        },
        orderBy: { createdAt: "desc" },
      });

      if (!record) return null;
      return mapToCheckoutSession(record);
    } catch (error: any) {
      console.error("CheckoutRepository.getSession error:", error);
      return null;
    }
  }

  /**
   * Create or replace a checkout session
   */
  static async createSession(
    cartId: string,
    userId?: string | null,
    guestEmail?: string | null
  ): Promise<CheckoutSession> {
    try {
      // First delete any existing session for this cart
      await prisma.checkoutSession.deleteMany({
        where: { cartId },
      }).catch(() => {});

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const record = await prisma.checkoutSession.create({
        data: {
          cartId,
          userId: userId || null,
          guestEmail: guestEmail || null,
          currentStep: "INFORMATION",
          expiresAt,
        },
      });

      return mapToCheckoutSession(record);
    } catch (error: any) {
      console.error("CheckoutRepository.createSession error:", error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Update checkout session step and data
   */
  static async updateSession(
    sessionId: string,
    updates: Partial<CheckoutSession>
  ): Promise<CheckoutSession> {
    try {
      const data: any = {};
      if (updates.current_step !== undefined) data.currentStep = updates.current_step;
      if (updates.shipping_address_snapshot !== undefined) {
        data.shippingAddressSnapshot = updates.shipping_address_snapshot as any;
      }
      if (updates.billing_address_snapshot !== undefined) {
        data.billingAddressSnapshot = updates.billing_address_snapshot as any;
      }
      if (updates.shipping_method !== undefined) data.shippingMethod = updates.shipping_method;
      if (updates.payment_method !== undefined) data.paymentMethod = updates.payment_method;
      if (updates.coupon_code !== undefined) data.couponCode = updates.coupon_code;
      if (updates.guest_email !== undefined) data.guestEmail = updates.guest_email;
      if (updates.user_id !== undefined) data.userId = updates.user_id;

      const record = await prisma.checkoutSession.update({
        where: { id: sessionId },
        data,
      });

      return mapToCheckoutSession(record);
    } catch (error: any) {
      console.error("CheckoutRepository.updateSession error:", error);
      throw new Error(`Failed to update checkout session: ${error.message}`);
    }
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await prisma.checkoutSession.delete({
      where: { id: sessionId },
    }).catch(() => {});
  }
}
