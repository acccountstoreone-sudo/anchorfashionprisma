import { CheckoutRepository } from "@/repositories/checkout.repository";
import { CheckoutSession, CheckoutStep } from "@/types/checkout.types";
import {
  AddressFormValues,
  CheckoutInformationFormValues,
  CheckoutPaymentFormValues,
  CheckoutShippingFormValues,
} from "@/schemas/checkout.schema";

export class CheckoutService {
  private checkoutRepository: CheckoutRepository;

  constructor() {
    this.checkoutRepository = new CheckoutRepository();
  }

  async getSession(id: string): Promise<CheckoutSession | null> {
    return await this.checkoutRepository.getCheckoutSessionById(id);
  }

  async initializeSession(
    cartId: string,
    userId?: string,
    guestEmail?: string
  ): Promise<CheckoutSession> {
    return await this.checkoutRepository.createCheckoutSession(
      cartId,
      userId,
      guestEmail
    );
  }

  async processInformationStep(
    sessionId: string,
    data: CheckoutInformationFormValues
  ): Promise<CheckoutSession> {
    return await this.checkoutRepository.updateCheckoutSession(sessionId, {
      guest_email: data.email,
      shipping_address_snapshot: data.shipping_address,
      current_step: "SHIPPING",
    });
  }

  async processShippingStep(
    sessionId: string,
    data: CheckoutShippingFormValues
  ): Promise<CheckoutSession> {
    return await this.checkoutRepository.updateCheckoutSession(sessionId, {
      shipping_method: data.shipping_method,
      current_step: "PAYMENT",
    });
  }

  async processPaymentStep(
    sessionId: string,
    data: CheckoutPaymentFormValues,
    shippingAddressSnapshot?: AddressFormValues | null
  ): Promise<CheckoutSession> {
    let billingAddress = data.billing_address;
    if (data.billing_address_same_as_shipping && shippingAddressSnapshot) {
      billingAddress = shippingAddressSnapshot;
    }

    return await this.checkoutRepository.updateCheckoutSession(sessionId, {
      payment_method: data.payment_method,
      billing_address_snapshot: billingAddress,
      current_step: "REVIEW",
    });
  }

  async updateCouponStep(
    sessionId: string,
    couponCode: string | null
  ): Promise<CheckoutSession> {
    return await this.checkoutRepository.updateCheckoutSession(sessionId, {
      coupon_code: couponCode,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.checkoutRepository.deleteCheckoutSession(sessionId);
  }
}
